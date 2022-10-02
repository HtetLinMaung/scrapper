const cheerio = require("cheerio");
const path = require("path");
const fs = require("fs");
const uuid = require("uuid");
const { brewBlankExpressFunc } = require("code-alchemy");
const { default: http } = require("starless-http");
const { asyncEach } = require("starless-async");
const { writeExcelFromJson } = require("starless-excel");
const scrapBySelector = require("../../../../utils/scrap-by-selector");
const jsonToCsv = require("../../../../utils/json-to-csv");
const jsonToSql = require("../../../../utils/json-to-sql");

const cacheRawData = {};
const cacheResponseBody = {};

module.exports = brewBlankExpressFunc(async (req, res) => {
  const { url, columns, exportas, cache } = req.body;

  if (cache && cacheResponseBody[JSON.stringify(req.body)]) {
    console.log("response cache body");
    res.json(cacheResponseBody[JSON.stringify(req.body)]);
  }
  let $ = null;
  if (cache) {
    if (!cacheRawData[url]) {
      const [response, err] = await http.get(url);
      if (err) {
        const error = new Error(err.message);
        error.status = 400;
        error.body = {
          code: 400,
          message: error.message,
        };
        throw error;
      }
      cacheRawData[url] = response.data;
    }

    $ = cheerio.load(cacheRawData[url]);
  } else {
    const [response, err] = await http.get(url);
    if (err) {
      const error = new Error(err.message);
      error.status = 400;
      error.body = {
        code: 400,
        message: error.message,
      };
      throw error;
    }
    cacheRawData[url] = response.data;
    $ = cheerio.load(cacheRawData[url]);
  }

  let data = [];
  if (Array.isArray(columns)) {
    const map = {};
    const fillnas = {};
    await asyncEach(columns, async ({ selector, attr, name, fillna }) => {
      map[name] = scrapBySelector($, selector, attr);
      if (fillna) {
        fillnas[name] = fillna;
      }
    });

    const max = Math.max(...Object.values(map).map((v) => v.length));

    const keys = columns.map((c) => c.name);
    for (let i = 0; i < max; i++) {
      const row = {};
      for (const key of keys) {
        row[key] = i >= map[key].length ? "" : map[key][i];
        if (key in fillnas && !row[key]) {
          row[key] = fillnas[key];
        }
      }

      data.push(row);
    }
  }

  if (cache) {
    http.get(url).then(([response, err]) => {
      if (err) {
        console.log(err);
      } else {
        console.log("caching in background");
        cacheRawData[url] = response.data;
      }
    });
  }

  let downloadurl = "";

  if (exportas) {
    const prefixFilePath = path.join("public", uuid.v4());
    if (!fs.existsSync(prefixFilePath)) {
      fs.mkdirSync(prefixFilePath);
    }
    const filepath = path.join(prefixFilePath, exportas);
    if (exportas.endsWith(".xlsx")) {
      await writeExcelFromJson(
        [
          {
            sheetName: "Data",
            data,
          },
        ],
        "file",
        filepath
      );
    } else if (exportas.endsWith(".csv")) {
      jsonToCsv(data, filepath);
    } else if (exportas.endsWith(".sql")) {
      jsonToSql(data, filepath);
    } else if (exportas.endsWith(".json")) {
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    }
    downloadurl = `${process.env.app_domain}/${filepath.replace(
      "public/",
      ""
    )}`;
    if (!cache) {
      setTimeout(() => {
        try {
          if (fs.existsSync(prefixFilePath)) {
            console.log("File expired and deleting!");
            fs.rmSync(prefixFilePath, { recursive: true });
          }
        } catch (err) {
          console.log(err);
        }
      }, 3600 * 1000);
    }
  }

  if (!cacheResponseBody[JSON.stringify(req.body)]) {
    cacheResponseBody[JSON.stringify(req.body)] = {
      code: 200,
      message: "Scraped successful!",
      data: downloadurl || data,
    };

    console.log("original response");
    res.json(cacheResponseBody[JSON.stringify(req.body)]);

    if (!cache) {
      console.log("delete response body cache");
      delete cacheResponseBody[JSON.stringify(req.body)];
    }
  }
});

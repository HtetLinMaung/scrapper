const fs = require("fs");

module.exports = (items = [], filepath = "") => {
  const patharr = filepath
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s);
  const tablename = patharr[patharr.length - 1].split(".")[0];
  let sql = "";
  if (items.length) {
    sql = `CREATE TABLE ${tablename} (\r\n`;
    const columnNames = Object.keys(items[0]).map((name) =>
      name.replaceAll(" ", "_")
    );
    sql +=
      columnNames
        .map((name) => `    ${name} VARCHAR(255) DEFAULT ''`)
        .join(",\r\n") + "\r\n);\r\n\r\n";

    sql += items
      .map(
        (item) =>
          `INSERT INTO ${tablename} (${columnNames.join(
            ", "
          )}) VALUES (${Object.values(item)
            .map((v) => `'${v.replaceAll("'", "''")}'`)
            .join(", ")})`
      )
      .join(";\r\n");
  }
  fs.writeFileSync(filepath, sql);
};

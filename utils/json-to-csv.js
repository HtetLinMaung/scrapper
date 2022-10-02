const fs = require("fs");

module.exports = (items, filepath) => {
  let csv = "";
  if (items.length) {
    csv += Object.keys(items[0]).join(",") + "\r\n";
    for (const item of items) {
      csv += Object.values(item).join(",") + "\r\n";
    }
  }
  fs.writeFileSync(filepath, csv);
};

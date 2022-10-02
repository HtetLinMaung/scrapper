const fs = require("fs");

exports.beforeServerStart = async () => {
  if (fs.existsSync("public")) {
    fs.rmSync("public", { recursive: true });
  }
  fs.mkdirSync("public");
};

module.exports = ($, selector = "body", attr = "text") => {
  const data = [];
  $(selector).each(function () {
    if (attr && attr != "text") {
      data.push($(this).attr("href"));
    } else {
      data.push($(this).text().trim());
    }
  });
  return data;
};

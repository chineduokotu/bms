const { Parser } = require('json2csv');

function exportToCSV(data, fields) {
  const parser = new Parser({ fields });
  return parser.parse(data);
}

module.exports = { exportToCSV };

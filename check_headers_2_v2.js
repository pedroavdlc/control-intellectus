const xlsx = require('xlsx');
const filePath = "C:\\Users\\SO\\Videos\\archivos wed intellectus\\Formato Reporte consumo mensual Intellectus ENERO - FEBRERO.xlsx";
const workbook = xlsx.readFile(filePath);
console.log("SHEETS:", workbook.SheetNames);
const sheet = workbook.Sheets[workbook.SheetNames[0]];

// Read with a range to skip header decorations
const data = xlsx.utils.sheet_to_json(sheet, { range: 5 });
console.log("HEADERS (range 5):", Object.keys(data[0] || {}));
console.log("SAMPLE ROW (range 5):", data[0]);

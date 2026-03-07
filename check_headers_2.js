const xlsx = require('xlsx');
const path = require('path');

const filePath = "C:\\Users\\SO\\Videos\\archivos wed intellectus\\Formato Reporte consumo mensual Intellectus ENERO - FEBRERO.xlsx";
try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log("HEADERS:", Object.keys(data[0] || {}));
    console.log("SAMPLE ROW:", data[0]);
} catch (e) {
    console.error("Error reading file:", e.message);
}

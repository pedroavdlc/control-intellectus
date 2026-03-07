const xlsx = require('xlsx');
const path = require('path');

const filePath = "C:\\Users\\SO\\Videos\\archivos wed intellectus\\CONTROL DE GEOS Y SABANAS.xlsx";
try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    console.log("HEADERS:", Object.keys(data[0] || {}));
    console.log("SAMPLE ROW:", data[0]);
} catch (e) {
    console.error("Error reading file:", e.message);
}

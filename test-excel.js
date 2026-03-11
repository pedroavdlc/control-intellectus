const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const BASE_STORAGE = "C:\\Users\\SO\\Videos\\archivos wed intellectus";
const FILE_CONTROL = "CONTROL DE GEOS Y SABANAS.xlsx";
const controlPath = path.join(BASE_STORAGE, FILE_CONTROL);

console.log('Path:', controlPath);
console.log('Exists:', fs.existsSync(controlPath));

try {
    const wb = xlsx.readFile(controlPath);
    const sn = wb.SheetNames[0];
    const ws = wb.Sheets[sn];
    const data = xlsx.utils.sheet_to_json(ws);
    
    console.log('Current rows:', data.length);
    if (data.length > 0) {
        console.log('Last row sample:', data[data.length - 1]);
    }

    // Try to add a test row
    data.push({
        'Núm. prog.': 9991,
        'folio': 'TEST_AUTO',
        'Teléfono': '1234567890',
        'Fecha consulta': new Date().toISOString()
    });

    const newWs = xlsx.utils.json_to_sheet(data);
    wb.Sheets[sn] = newWs;
    
    xlsx.writeFile(wb, controlPath);
    console.log('Successfully wrote to file.');

} catch (err) {
    console.error('ERROR:', err.message);
}

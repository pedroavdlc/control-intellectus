const xlsx = require('xlsx');

const data = [
    { ID: 1, Nombre: 'Juan Perez', Telefono: '5512345678', Lat: 19.4326, Lng: -99.1332 },
    { ID: 2, Nombre: 'Maria Lopez', Telefono: '5587654321', Lat: 19.4270, Lng: -99.1276 }
];

const ws = xlsx.utils.json_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Datos");
xlsx.writeFile(wb, "test_excel.xlsx");
console.log("Excel test file created.");

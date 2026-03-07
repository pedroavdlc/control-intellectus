const pdf = require('pdf-parse');
const fs = require('fs');
fs.writeFileSync('keys.txt', JSON.stringify(Object.keys(pdf)));

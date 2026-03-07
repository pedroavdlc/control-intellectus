const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function check() {
    const dataBuffer = fs.readFileSync('C:\\Users\\SO\\Videos\\intellectus\\526633610898_27022026_022051.pdf');
    const pdfParser = new PDFParse();

    try {
        const data = await pdfParser.parseBuffer(dataBuffer);
        console.log("PDF Text Content:");
        console.log("------------------");
        console.log(data.text);
        console.log("------------------");
    } catch (err) {
        console.error("Error parsing PDF:", err);
    }
}

check();

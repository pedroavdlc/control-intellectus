const { PDFParse } = require('pdf-parse');
const fs = require('fs');

async function check() {
    const dataBuffer = fs.readFileSync('C:\\Users\\SO\\Videos\\intellectus\\526633610898_27022026_022051.pdf');
    try {
        console.log("Initializing PDFParse with data...");
        // Use Uint8Array as it is more standard for pdfjs
        const parser = new PDFParse({ data: new Uint8Array(dataBuffer) });
        console.log("Extracting text...");
        const result = await parser.getText();
        console.log("Text length:", result.text.length);
        console.log("PDF Text Content (first 1000 chars):");
        console.log("------------------");
        console.log(result.text.substring(0, 1000));
        console.log("------------------");

        // Let's also look for phone numbers and coordinates
        const phoneRegex = /\b\d{10,}\b/g;
        const geoRegex = /(-?\d+\.\d+),\s*(-?\d+\.\d+)/g;

        console.log("Potential Phones:", result.text.match(phoneRegex));
        console.log("Potential Geo:", result.text.match(geoRegex));

        await parser.destroy();
        process.exit(0);
    } catch (e) {
        console.error("Error details:", e);
        process.exit(1);
    }
}

check();

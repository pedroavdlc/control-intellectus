import fs from 'fs';
import { PDFParse } from 'pdf-parse';

async function testPdf() {
    try {
        const filePath = 'c:\\Users\\SO\\Videos\\intellectus\\526633610898_27022026_022051.pdf';
        const buffer = fs.readFileSync(filePath);

        // Use the same worker path as in the API
        PDFParse.setWorker('file:///C:/Users/SO/Videos/intellectus/project-intellectus/node_modules/pdfjs-dist/build/pdf.worker.mjs');

        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await parser.getText();
        const text = result.text;

        console.log("--- START TEXT ---");
        console.log(text);
        console.log("--- END TEXT ---");

        const geoRegex = /(-?\d+\.\d+),\s*(-?\d+\.\d+)/g;
        const geos = text.match(geoRegex) || [];
        console.log("Geos matched:", geos);

        const addressRegex = /Address\s+([\s\S]+?)\s+MCC\/MNC/i;
        const addressMatch = text.match(addressRegex);
        console.log("Address match:", addressMatch ? addressMatch[1] : "None");

        await parser.destroy();
    } catch (error) {
        console.error("Error:", error);
    }
}

testPdf();

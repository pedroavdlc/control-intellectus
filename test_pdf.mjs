
import { PDFParse } from 'pdf-parse';
import fs from 'fs';
import path from 'path';

async function test() {
    try {
        console.log("Loading file...");
        const buffer = fs.readFileSync('C:/Users/SO/Videos/intellectus/526633610898_27022026_022051.pdf');

        console.log("Setting worker...");
        // Test with the same path as the API
        PDFParse.setWorker('file:///C:/Users/SO/Videos/intellectus/project-intellectus/node_modules/pdfjs-dist/build/pdf.worker.mjs');

        console.log("Parsing...");
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await parser.getText();

        console.log("Text extracted:", result.text.substring(0, 100));
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

test();

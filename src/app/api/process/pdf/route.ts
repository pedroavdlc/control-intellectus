import { NextRequest, NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();

        // Explicitly set the worker path using file:// protocol for Windows/ESM compatibility
        PDFParse.setWorker('file:///C:/Users/SO/Videos/intellectus/project-intellectus/node_modules/pdfjs-dist/build/pdf.worker.mjs');

        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await parser.getText();

        const text = result.text;

        // Extraction logic
        const phoneRegex = /\+?\d{10,12}/g;
        const geoRegex = /(-?\d+\.\d+),\s*(-?\d+\.\d+)/g;
        const addressRegex = /Address\s+([\s\S]+?)\s+MCC\/MNC/i;
        const locatedDateRegex = /Located Date\s+([\s\S]+?)\s+Provider/i;

        const phones = text.match(phoneRegex) || [];
        const geos = text.match(geoRegex) || [];
        const addressMatch = text.match(addressRegex);
        const locatedDateMatch = text.match(locatedDateRegex);

        const extractedData = {
            phone: phones[0] || 'Desconocido',
            lat: geos[0] ? parseFloat(geos[0].split(',')[0]) : null,
            lng: geos[0] ? parseFloat(geos[0].split(',')[1]) : null,
            address: addressMatch ? addressMatch[1].replace(/\n/g, ' ').trim() : 'No encontrada',
            date: locatedDateMatch ? locatedDateMatch[1].trim() : 'N/A',
            fullText: text.substring(0, 1000),
        };

        await parser.destroy();

        return NextResponse.json({
            success: true,
            data: extractedData
        });

    } catch (error: any) {
        console.error('Error processing PDF:', error);
        return NextResponse.json({
            error: 'Error al procesar el PDF',
            details: error.message
        }, { status: 500 });
    }
}

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
        const fileName = file.name;

        // Extraction logic
        const textToSearch = text.substring(0, 5000); // Limit search range if needed, but here text is small

        // 1. Coordinates: match "19.123, -99.123" or "Lat: 19.123 Lon: -99.123"
        // Try multiple regexes
        const commaGeoRegex = /(-?\d+\.\d+),\s*(-?\d+\.\d+)/g;
        const labeledGeoRegex = /Lat(?:itude)?[:\s]+(-?\d+\.\d+)[\s,]+Lon(?:gitude)?[:\s]+(-?\d+\.\d+)/gi;

        const commaGeos = [...textToSearch.matchAll(commaGeoRegex)];
        const labeledGeos = [...textToSearch.matchAll(labeledGeoRegex)];

        let lat: number | null = null;
        let lng: number | null = null;

        if (labeledGeos.length > 0) {
            lat = parseFloat(labeledGeos[0][1]);
            lng = parseFloat(labeledGeos[0][2]);
        } else if (commaGeos.length > 0) {
            lat = parseFloat(commaGeos[0][1]);
            lng = parseFloat(commaGeos[0][2]);
        }

        // 2. Phone
        const phoneRegex = /\+?\d{10,12}/g;
        const phones = textToSearch.match(phoneRegex) || [];

        // 3. Address
        const addressRegex = /Address\s+([\s\S]+?)\s+(?:MCC\/MNC|Radius|Provider)/i;
        const addressMatch = textToSearch.match(addressRegex);

        // 4. Other fields
        const locatedDateRegex = /Located Date\s+([\s\S]+?)\s+Provider/i;
        const queryIdRegex = /(?:Query ID|Order No|Folio|Expediente|Referencia)[:\s]+([a-zA-Z0-9.-]+)/i;
        const companyRegex = /Provider\s+([\w\s]+?)\s+/i;

        const locatedDateMatch = textToSearch.match(locatedDateRegex);
        const queryIdMatch = textToSearch.match(queryIdRegex);
        const companyMatch = textToSearch.match(companyRegex);

        // Folio logic: Extract first number sequence from filename if no Query ID found in text
        let folio = queryIdMatch ? queryIdMatch[1] : 'S/F';
        if (folio === 'S/F' && fileName) {
            const fileNumMatch = fileName.split(/[_\-\s]/).find(part => part.length >= 4 && part.length <= 8);
            if (fileNumMatch) folio = fileNumMatch;
        }

        // Final safety: if folio matches the phone, it was likely just the phone context
        const phone = phones[0] || '';
        if (folio.replace(/\D/g, '') === phone.replace(/\D/g, '') && folio.length > 5) {
            folio = 'S/F';
        }

        // 5. Antenna / Radio Base Info
        // Regex designed to match the exact labels seen in the PDF:
        //   MCC/MNC   334/20
        //   LAC       5635
        //   Cell Id/ECI  36142873
        const lacRegex = /LAC[\s:/]+(\d+)/i;
        const cidRegex = /(?:Cell\s*Id(?:\/ECI)?|ECI|CID|Cell\s*ID)[\s:/]+(\d+)/i;
        const mccMncRegex = /MCC\s*\/?\s*MNC[\s:/]+([\d]+)\s*\/\s*([\d]+)/i;
        const radiusRegex = /Radius[\s:/]+([\d]+(?:\.[\d]+)?)/i;
        const radioGeoRegex = /(?:Radio Base|Antenna|BTS)(?:[\s\S]*?)Lat(?:itude)?[:\s]+(-?\d+\.\d+)[\s,]+Lon(?:gitude)?[:\s]+(-?\d+\.\d+)/gi;

        const lacMatch = textToSearch.match(lacRegex);
        const cidMatch = textToSearch.match(cidRegex);
        const mccMncMatch = textToSearch.match(mccMncRegex);
        const radiusMatch = textToSearch.match(radiusRegex);
        const radioGeos = [...textToSearch.matchAll(radioGeoRegex)];

        let antennaLat: number | null = null;
        let antennaLng: number | null = null;

        if (radioGeos.length > 0) {
            antennaLat = parseFloat(radioGeos[0][1]);
            antennaLng = parseFloat(radioGeos[0][2]);
        }

        const mcc = mccMncMatch ? mccMncMatch[1] : null;
        const mnc = mccMncMatch ? mccMncMatch[2] : null;
        const radius = radiusMatch ? parseFloat(radiusMatch[1]) : null;

        const extractedData = {
            phone: phones[0] || 'Desconocido',
            folio: folio,
            company: companyMatch ? companyMatch[1].trim() : 'Desconocida',
            lat,
            lng,
            antennaLat,
            antennaLng,
            lac: lacMatch ? lacMatch[1] : null,
            cid: cidMatch ? cidMatch[1] : null,
            mcc: mcc,
            mnc: mnc,
            radius: radius,
            result: lat && lng ? 'Positivo' : 'Negativo',
            address: addressMatch ? addressMatch[1].replace(/\n/g, ' ').trim() : 'No encontrada',
            date: locatedDateMatch ? locatedDateMatch[1].trim() : new Date().toLocaleString('es-ES'),
            fullText: text.substring(0, 500),
        };

        console.log(`PDF Processed: ${fileName}, Lat: ${lat}, Lng: ${lng}, Status: ${extractedData.result}`);

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

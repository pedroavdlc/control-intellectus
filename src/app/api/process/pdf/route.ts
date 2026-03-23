import { NextRequest, NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import path from 'path';
import fs from 'fs';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        // Prevent 'detached ArrayBuffer' Next.js 15 / Node 20 bug by slicing the buffer
        const buffer = Buffer.from(arrayBuffer.slice(0));

        console.log('[PDF API] File received, size:', buffer.length);

        // Explicitly set the worker path using process.cwd() for flexibility
        const workerPath = `file:///${path.join(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.mjs').replace(/\\/g, '/')}`;
        console.log('[PDF API] Setting worker path:', workerPath);
        PDFParse.setWorker(workerPath);

        console.log('[PDF API] Initializing parser...');
        const parser = new PDFParse({ data: new Uint8Array(buffer) });

        console.log('[PDF API] Extracting text...');
        const result = await parser.getText();
        console.log('[PDF API] Text extracted summary:', result.text.substring(0, 50));

        const text = result.text;
        const fileName = file.name;

        // LOG: print first 1000 chars to understand the PDF structure
        console.log('[PDF API] === RAW TEXT START ===');
        console.log(text.substring(0, 1000));
        console.log('[PDF API] === RAW TEXT END ===');

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
        const addressRegex = /Address\s+([\s\S]+?)\s+(?:MCC\/MNC|Radius|Proveedor|Provider)/i;
        const addressMatch = textToSearch.match(addressRegex);

        // 4. Other fields
        // Match date from PDFs with various labels (English or Spanish)
        const locatedDateRegex = /(?:Located Date|Fecha(?:\s+de\s+\w+)?)[\s\t]+([A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d{1,2}\s+\d{4}(?:\s+\d{2}:\d{2}:\d{2})?|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?)/i;
        const queryIdRegex = /(?:Query ID|Order No|Folio|Expediente|Referencia|N[uú]mero de Caso)[:\s]+([a-zA-Z0-9.-]+)/i;
        // Match first word-token after Proveedor/Provider (PDF tables put adjacent cell data on same line)
        const companyRegex = /(?:Proveedor|Provider)[ \t]+(\S+)/i;

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
        // Priority for CID: look for longer numbers first or specific labels
        const cidRegex = /(?:Cell\s*Id(?:\/ECI)?|ECI|Cell\s*ID)[\s:/]+(\d{5,})/i; // Require at least 5 digits for the big ECI
        const smallCidRegex = /(?:CID|LCID)[\s:/]+(\d+)/i;

        const mccMncRegex = /MCC\s*\/?\s*MNC[\s:/]+([\d]+)\s*\/\s*([\d]+)/i;
        const radiusRegex = /Radius[\s:/]+([\d]+(?:\.[\d]+)?)/i;
        const radioGeoRegex = /(?:Radio Base|Antenna|BTS)(?:[\s\S]*?)Lat(?:itude)?[:\s]+(-?\d+\.\d+)[\s,]+Lon(?:gitude)?[:\s]+(-?\d+\.\d+)/gi;

        const lacMatch = textToSearch.match(lacRegex);
        let cidMatch = textToSearch.match(cidRegex);
        if (!cidMatch) cidMatch = textToSearch.match(smallCidRegex); // Fallback to smaller CID if no big ECI found

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

        // 7. Provider lookup / update in DB
        const normalizePhone = (p: string) => {
            const clean = (p || '').replace(/\D/g, '');
            if (clean.length > 10 && clean.startsWith('52')) return clean.substring(2);
            if (clean.length > 10 && clean.startsWith('044')) return clean.substring(3);
            return clean;
        };

        const rawPhone = phones[0] || '';
        const normalizedPhone = normalizePhone(rawPhone);
        let finalCompany = companyMatch ? companyMatch[1].trim().replace(/\s+/g, ' ').toUpperCase() : '';
        console.log('[PDF API] companyMatch raw:', companyMatch ? companyMatch[0] : 'NO MATCH');
        console.log('[PDF API] finalCompany extracted:', finalCompany);

        // Look up known provider in DB for this device
        let knownProvider: string | null = null;
        if (normalizedPhone) {
            try {
                const device = await (prisma.device as any).findUnique({ where: { phone: normalizedPhone } });
                knownProvider = (device as any)?.provider || null;

                // If PDF has a new provider, update the device immediately
                if (finalCompany && finalCompany !== 'DESCONOCIDA' && finalCompany !== knownProvider) {
                    await (prisma.device as any).upsert({
                        where: { phone: normalizedPhone },
                        update: { provider: finalCompany },
                        create: { phone: normalizedPhone, provider: finalCompany },
                    });
                    console.log(`[PDF API] Updated provider for ${normalizedPhone}: ${finalCompany}`);
                }
            } catch (dbErr) {
                console.warn('[PDF API] Could not look up/update device provider:', dbErr);
            }
        }

        // Use PDF company, fall back to DB-stored provider
        if (!finalCompany || finalCompany === 'DESCONOCIDA') {
            finalCompany = knownProvider?.toUpperCase() || '';
        }

        // Parse and format the extracted date properly
        let formattedDate = '';
        let folderDate = '';
        if (locatedDateMatch) {
            const raw = locatedDateMatch[1].trim();
            try {
                const parsed = new Date(raw);
                if (!isNaN(parsed.getTime())) {
                    // Format for display: DD/MM/YYYY HH:MM
                    formattedDate = parsed.toLocaleString('es-MX', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: false
                    });
                    // Format for folder: YYYY-MM-DD
                    folderDate = parsed.toISOString().split('T')[0];
                } else {
                    formattedDate = raw;
                    folderDate = raw.split(' ')[0].replace(/[\/:]/g, '-');
                }
            } catch {
                formattedDate = raw;
                folderDate = raw.split(' ')[0].replace(/[\/:]/g, '-');
            }
        } else {
            const now = new Date();
            formattedDate = now.toLocaleDateString('es-MX', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: false
            });
            folderDate = now.toISOString().split('T')[0];
        }

        const cleanPhone = (phones[0] || 'Desconocido').replace(/\D/g, '');
        const storageDir = path.join(process.cwd(), 'storage', 'PDFs', cleanPhone, folderDate);
        if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
        const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = path.join(storageDir, safeFileName);
        fs.writeFileSync(filePath, Buffer.from(buffer));

        const fileRecord = await (prisma as any).fileRecord.create({
            data: {
                fileName: fileName,
                filePath: filePath.replace(process.cwd(), '').replace(/\\/g, '/'),
                fileType: 'PDF',
                phone: phones[0] || 'Desconocido',
                date: new Date(),
            }
        });

        const extractedData = {
            id: fileRecord.id,
            phone: phones[0] || 'Desconocido',
            folio: folio,
            company: finalCompany || 'Desconocida',
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
            date: formattedDate,
            fullText: text.substring(0, 500),
            fileUrl: `/api/files/${fileRecord.id}`
        };

        console.log(`[PDF API] Processed: ${fileName} | Phone: ${normalizedPhone} | Company: ${finalCompany} | Lat: ${lat}, Lng: ${lng}`);

        await parser.destroy();

        return NextResponse.json({
            success: true,
            data: extractedData
        });

    } catch (error: any) {
        console.error('Error processing PDF:', error);
        // Log to a file as well to be sure we see it
        try {
            const fs = require('fs');
            const logMsg = `[${new Date().toISOString()}] Error processing PDF: ${error.message}\n${error.stack}\n`;
            fs.appendFileSync('C:/Users/SO/Videos/intellectus/project-intellectus/error_logs.txt', logMsg);
        } catch (e) { }

        return NextResponse.json({
            success: false, // Changed from error: ... to success: false
            error: 'Error al procesar el PDF',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

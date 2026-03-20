import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';
import { prisma } from '@/lib/prisma';

const BASE_STORAGE = process.env.STORAGE_BASE || path.join(process.cwd(), 'storage');
const FILE_CONTROL = "CONTROL DE GEOS Y SABANAS.xlsx";
const FILE_REPORT = "Formato Reporte consumo mensual Intellectus MARZO - ABRIL.xlsx";

const normalizePhone = (p: string) => {
    const clean = (p || '').replace(/\D/g, '');
    if (clean.length > 10 && clean.startsWith('52')) return clean.substring(2);
    if (clean.length > 10 && clean.startsWith('044')) return clean.substring(3);
    return clean;
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            numProg: userNumProg,
            date,
            author,
            company,
            type,
            area,
            result,
            folio,
            creditsAvailable,
            creditsApplied,
            phone,
            fileContent,
            fileName,
            fileId
        } = body;

        let numProg = userNumProg;

        // 1. Calculate Progressive Number if not provided or 0
        const controlPath = path.join(BASE_STORAGE, FILE_CONTROL);
        let controlData: any[] = [];
        let wbControl: any;
        let sheetNameControl = "";
        let excelSaved = false;

        try {
            console.log(`[Save] Checking control Excel at: ${controlPath}`);
            if (fs.existsSync(controlPath)) {
                // Use fs.readFileSync for more literal access
                const fileBuffer = fs.readFileSync(controlPath);
                wbControl = xlsx.read(fileBuffer, { type: 'buffer' });
                sheetNameControl = wbControl.SheetNames[0];
                const ws = wbControl.Sheets[sheetNameControl];
                controlData = xlsx.utils.sheet_to_json(ws);
                console.log(`[Save] Loaded ${controlData.length} rows from ${sheetNameControl}`);

                if (numProg <= 0) {
                    const lastEntry = controlData[controlData.length - 1];
                    const lastNum = lastEntry ? parseInt(lastEntry['Núm. prog.'] || '0') : 0;
                    numProg = lastNum + 1;
                }
            } else {
                console.warn('[Save] Control Excel does not exist at:', controlPath);
            }
        } catch (excelReadErr: any) {
            console.error('[Save] Error reading control Excel:', excelReadErr.message);
        }

        // 2. Folder Storage
        const cleanPhone = (phone || 'Desconocido').replace(/\D/g, '');
        const phoneDir = path.join(BASE_STORAGE, cleanPhone);
        const typeFolder = type === 'GEO' ? 'GEOLOCALIZACIONES' : 'SABANAS';
        
        // Extract date for folder (YYYY-MM-DD or DD-MM-YYYY)
        const dateForFolder = date ? date.split(' ')[0].replace(/\//g, '-') : new Date().toLocaleDateString('es-ES').replace(/\//g, '-');
        
        const typeDir = path.join(phoneDir, typeFolder, dateForFolder);

        try {
            if (!fs.existsSync(phoneDir)) fs.mkdirSync(phoneDir, { recursive: true });
            if (!fs.existsSync(path.join(phoneDir, typeFolder))) fs.mkdirSync(path.join(phoneDir, typeFolder), { recursive: true });
            if (!fs.existsSync(typeDir)) fs.mkdirSync(typeDir, { recursive: true });
        } catch (dirErr) {
            console.warn('[Save] Could not create storage folders:', (dirErr as any).message);
        }

        let filePath = "";

        if (fileId) {
            try {
                const fileRecord = await prisma.fileRecord.findUnique({ where: { id: fileId } });
                if (fileRecord) {
                    const originalPath = fileRecord.filePath.startsWith('/') 
                        ? path.join(process.cwd(), fileRecord.filePath)
                        : fileRecord.filePath;
                    if (fs.existsSync(originalPath)) {
                        filePath = path.join(typeDir, fileRecord.fileName);
                        fs.copyFileSync(originalPath, filePath);
                        console.log(`[Save] Copied file from ${originalPath} to ${filePath}`);
                    }
                }
            } catch (err: any) {
                console.warn('[Save] Error copying file from ID:', err.message);
            }
        } else if (fileContent && fileName) {
            try {
                filePath = path.join(typeDir, fileName);
                const buffer = Buffer.from(fileContent, 'base64');
                fs.writeFileSync(filePath, buffer);
            } catch (fileErr) {
                console.warn('[Save] Could not write file:', (fileErr as any).message);
            }
        }

        // 3. Save to Control Excel
        console.log(`[Save] Preparing to save to control Excel. wbControl exists: ${!!wbControl}`);
        try {
            if (wbControl) {
                // Ensure all texts are UPPERCASE before writing to Excel
                controlData.push({
                    'Núm. prog.': numProg,
                    'folio': (folio || '').toString().toUpperCase(),
                    'Teléfono': (phone || '').toString().toUpperCase(),
                    'Fecha consulta': date,
                    'Realizó la consulta': (author || '').toUpperCase(),
                    'Compañía': (company || '').toUpperCase(),
                    'Tipo de consulta': (type || '').toUpperCase(),
                    'Area solicitante': (area || '').toUpperCase(),
                    'Resultado\r\n(POS / NEG)': (result || '').toUpperCase(),
                    'Latitud': body.lat || '',
                    'Longitud': body.lng || '',
                    'Antenna Lat': body.antennaLat || '',
                    'Antenna Lng': body.antennaLng || '',
                    'Radio': body.radius || '',
                    'Sector JSON': body.antennaSector ? JSON.stringify(body.antennaSector) : '',
                    'Ubicación Archivo': filePath
                });

                const newWs = xlsx.utils.json_to_sheet(controlData);
                wbControl.Sheets[sheetNameControl] = newWs;
                
                // Write to buffer first, then use fs for more direct control/error reporting
                const excelBuf = xlsx.write(wbControl, { type: 'buffer', bookType: 'xlsx' });
                fs.writeFileSync(controlPath, excelBuf);
                
                excelSaved = true;
                console.log('[Save] Successfully updated Control Excel at:', controlPath);
            }
        } catch (excelWriteErr: any) {
            console.error('[Save] Error writing control Excel (Direct FS):', excelWriteErr.code, excelWriteErr.message);
            excelSaved = false;
        }

        // 4. Update Monthly Report
        try {
            const reportPath = path.join(BASE_STORAGE, FILE_REPORT);
            if (fs.existsSync(reportPath)) {
                const reportBuffer = fs.readFileSync(reportPath);
                const wb = xlsx.read(reportBuffer, { type: 'buffer' });
                const now = new Date();
                const monthMap: Record<number, string> = {
                    0: 'ENERO', 1: 'FEBRERO', 2: 'MARZO', 3: 'ABRIL', 4: 'MAYO', 5: 'JUNIO',
                    6: 'JULIO', 7: 'AGOSTO', 8: 'SEPTIEMBRE', 9: 'OCTUBRE', 10: 'NOVIEMBRE', 11: 'DICIEMBRE'
                };

                let sheetName = monthMap[now.getMonth()];
                
                // If the month sheet doesn't exist, try to clone the template or create it
                if (!wb.SheetNames.includes(sheetName)) {
                    console.log(`[Save] Creating new sheet for month: ${sheetName}`);
                    // Basic fallback: just use the first sheet if we can't create one easily with formatting
                    // But here we'll just try to write into it anyway
                }

                const ws = wb.Sheets[sheetName] || wb.Sheets[wb.SheetNames[0]];
                const rows: any[] = xlsx.utils.sheet_to_json(ws, { range: 4, header: 1 });

                const newRow = [
                    numProg, date, (author || '').toUpperCase(), (company || '').toUpperCase(), (type || 'GEO').toUpperCase(), (area || '').toUpperCase(),
                    body.creditsAvailable || 0, body.creditsApplied || 1,
                    ((body.creditsAvailable || 0) - (body.creditsApplied || 1)), (result || '').toUpperCase()
                ];

                rows.push(newRow);
                const templateRows: any[] = xlsx.utils.sheet_to_json(ws, { header: 1, range: 0 }).slice(0, 5);
                const finalData = [...templateRows, ...rows];
                const newWs = xlsx.utils.aoa_to_sheet(finalData);
                
                if (!wb.Sheets[sheetName]) {
                    xlsx.utils.book_append_sheet(wb, newWs, sheetName);
                } else {
                    wb.Sheets[sheetName] = newWs;
                }
                
                const reportBuf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
                fs.writeFileSync(reportPath, reportBuf);
                
                console.log('[Save] Successfully updated Monthly Report at:', reportPath);
            }
        } catch (reportErr: any) {
            console.error('[Save] Error updating monthly report (Direct FS):', reportErr.code, reportErr.message);
        }

        // 5. DB Persistence (Real Database) — always runs regardless of Excel errors
        let isDuplicate = false;
        if (type === 'GEO' && phone) {
            try {
                const { prisma } = await import('@/lib/prisma');
                const normalized = normalizePhone(String(phone));
                
                const device = await (prisma.device as any).upsert({
                    where: { phone: normalized },
                    update: { provider: company || undefined },
                    create: { phone: normalized, provider: company || null },
                });

                // Check for duplicates before creating (Phone + Exact Date/Time is the definitive key)
                const existingLocation = await (prisma.location as any).findFirst({
                    where: {
                        deviceId: device.id,
                        date: date
                    }
                });

                if (existingLocation) {
                    console.log(`[DB] Duplicate detected for ${normalized} at ${date}. Skipping save.`);
                    isDuplicate = true;
                } else {
                    await (prisma.location as any).create({
                        data: {
                            deviceId: device.id,
                            lat: parseFloat(body.lat) || 0,
                            lng: parseFloat(body.lng) || 0,
                            antennaLat: body.antennaLat ? parseFloat(body.antennaLat) : null,
                            antennaLng: body.antennaLng ? parseFloat(body.antennaLng) : null,
                            radius: body.radius ? parseFloat(body.radius) : null,
                            address: body.area || 'Búsqueda de geolocalización',
                            date: date,
                            timestamp: body.timestamp ? BigInt(body.timestamp) : null,
                            antennaSector: body.antennaSector ? JSON.stringify(body.antennaSector) : null,
                            fileId: body.fileId || null,
                        }
                    });
                    console.log(`[DB] Saved location for ${normalized} | lat:${body.lat} lng:${body.lng} | radius:${body.radius ?? 'null'}`);
                }

            } catch (dbError) {
                console.error('[DB] Failed to save history to database:', dbError);
            }
        }

        // Siempre guardar la pista de auditoría (incluyendo Sabanas)
        try {
            const { prisma } = await import('@/lib/prisma');
            await (prisma as any).consultation.create({
                data: {
                    numProg: numProg || null,
                    folio: (folio || '').toString().toUpperCase(),
                    phone: (phone || '').toString().toUpperCase(),
                    date: date || new Date().toISOString(),
                    author: (author || '').toUpperCase(),
                    company: (company || '').toUpperCase(),
                    type: (type || 'GEO').toUpperCase(),
                    area: (area || '').toUpperCase(),
                    result: (result || '').toUpperCase(),
                    creditsUsed: (body.creditsApplied || 1),
                    filePath: filePath ? String(filePath) : null
                }
            });
            console.log(`[Save] Consultation Audit properly saved to SQL.`);
        } catch (auditErr: any) {
            console.error('[Save] Error saving to SQL Consultation Table:', auditErr);
        }

        return NextResponse.json({
            success: true,
            numProg: numProg,
            folderPath: typeDir,
            filePath: filePath,
            isDuplicate: isDuplicate,
            excelSaved: excelSaved
        });
    } catch (error: any) {
        console.error('Error in save operation:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

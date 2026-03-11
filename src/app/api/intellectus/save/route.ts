import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';

const BASE_STORAGE = "C:\\Users\\SO\\Videos\\archivos wed intellectus";
const FILE_CONTROL = "CONTROL DE GEOS Y SABANAS.xlsx";
const FILE_REPORT = "Formato Reporte consumo mensual Intellectus ENERO - FEBRERO.xlsx";

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
            fileName
        } = body;

        let numProg = userNumProg;

        // 1. Calculate Progressive Number if not provided or 0
        const controlPath = path.join(BASE_STORAGE, FILE_CONTROL);
        let controlData: any[] = [];
        let wbControl: any;
        let sheetNameControl = "";
        let excelSaved = false;

        try {
            if (fs.existsSync(controlPath)) {
                wbControl = xlsx.readFile(controlPath);
                sheetNameControl = wbControl.SheetNames[0];
                const ws = wbControl.Sheets[sheetNameControl];
                controlData = xlsx.utils.sheet_to_json(ws);

                if (numProg <= 0) {
                    const lastEntry = controlData[controlData.length - 1];
                    const lastNum = lastEntry ? parseInt(lastEntry['Núm. prog.'] || '0') : 0;
                    numProg = lastNum + 1;
                }
            } else {
                console.warn('[Save] Control Excel does not exist at:', controlPath);
            }
        } catch (excelReadErr: any) {
            console.warn('[Save] Could not read control Excel (might be open/locked):', excelReadErr.message);
            // We set excelSaved to false later if we can't write, but we already know we can't if we can't read.
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
        if (fileContent && fileName) {
            try {
                filePath = path.join(typeDir, fileName);
                const buffer = Buffer.from(fileContent, 'base64');
                fs.writeFileSync(filePath, buffer);
            } catch (fileErr) {
                console.warn('[Save] Could not write file:', (fileErr as any).message);
            }
        }

        // 3. Save to Control Excel
        try {
            if (wbControl) {
                controlData.push({
                    'Núm. prog.': numProg,
                    'folio': folio || '',
                    'Teléfono': phone || '',
                    'Fecha consulta': date,
                    'Realizó la consulta': author,
                    'Compañía': company,
                    'Tipo de consulta': type,
                    'Area solicitante': area,
                    'Resultado\r\n(POS / NEG)': result,
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
                xlsx.writeFile(wbControl, controlPath);
                excelSaved = true;
                console.log('[Save] Successfully updated Control Excel at:', controlPath);
            }
        } catch (excelWriteErr: any) {
            console.warn('[Save] Could not write control Excel:', excelWriteErr.message);
            excelSaved = false;
        }

        // 4. Update Monthly Report
        try {
            const reportPath = path.join(BASE_STORAGE, FILE_REPORT);
            if (fs.existsSync(reportPath)) {
                const wb = xlsx.readFile(reportPath);
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
                const rows: any[] = xlsx.utils.sheet_to_json(ws, { range: 5, header: 1 });

                const newRow = [
                    numProg, date, author, company, type || 'GEO', area,
                    creditsAvailable || 0, creditsApplied || 1,
                    ((creditsAvailable || 0) - (creditsApplied || 1)), result
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
                
                xlsx.writeFile(wb, reportPath);
                console.log('[Save] Successfully updated Monthly Report at:', reportPath);
            }
        } catch (reportErr: any) {
            console.warn('[Save] Could not update monthly report:', reportErr.message);
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

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';

const BASE_STORAGE = "C:\\Users\\SO\\Videos\\archivos wed intellectus";
const FILE_CONTROL = "CONTROL DE GEOS Y SABANAS.xlsx";
const FILE_REPORT = "Formato Reporte consumo mensual Intellectus ENERO - FEBRERO.xlsx";

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
        }

        // 2. Folder Storage
        const phoneDir = path.join(BASE_STORAGE, phone || 'Desconocido');
        const typeFolder = type === 'GEO' ? 'GEOLOCALIZACIONES' : 'SABANAS';
        const typeDir = path.join(phoneDir, typeFolder);

        if (!fs.existsSync(phoneDir)) fs.mkdirSync(phoneDir, { recursive: true });
        if (!fs.existsSync(typeDir)) fs.mkdirSync(typeDir, { recursive: true });

        let filePath = "";
        if (fileContent && fileName) {
            filePath = path.join(typeDir, fileName);
            const buffer = Buffer.from(fileContent, 'base64');
            fs.writeFileSync(filePath, buffer);
        }

        // 3. Save to Control Excel
        if (wbControl) {
            controlData.push({
                'Núm. prog.': numProg,
                'folio': folio || '',
                'Fecha consulta': date,
                'Realizó la consulta': author,
                'Compañía': company,
                'Tipo de consulta': type,
                'Area solicitante': area,
                'Resultado\r\n(POS / NEG)': result,
                'Ubicación Archivo': filePath
            });

            const newWs = xlsx.utils.json_to_sheet(controlData);
            wbControl.Sheets[sheetNameControl] = newWs;
            xlsx.writeFile(wbControl, controlPath);
        }

        // 4. Update Monthly Report
        const reportPath = path.join(BASE_STORAGE, FILE_REPORT);
        if (fs.existsSync(reportPath)) {
            const wb = xlsx.readFile(reportPath);
            const now = new Date();
            const monthMap: Record<number, string> = {
                0: 'ENERO', 1: 'FEBRERO', 2: 'MARZO', 3: 'ABRIL', 4: 'MAYO', 5: 'JUNIO',
                6: 'JULIO', 7: 'AGOSTO', 8: 'SEPTIEMBRE', 9: 'OCTUBRE', 10: 'NOVIEMBRE', 11: 'DICIEMBRE'
            };

            let sheetName = monthMap[now.getMonth()];
            if (!wb.SheetNames.includes(sheetName)) sheetName = wb.SheetNames[0];

            const ws = wb.Sheets[sheetName];
            const rows: any[] = xlsx.utils.sheet_to_json(ws, { range: 5, header: 1 });

            const newRow = [
                numProg,
                date,
                author,
                company,
                type,
                area,
                creditsAvailable,
                creditsApplied,
                (creditsAvailable - creditsApplied),
                result
            ];

            rows.push(newRow);
            const templateRows: any[] = xlsx.utils.sheet_to_json(ws, { header: 1, range: 0 }).slice(0, 5);
            const finalData = [...templateRows, ...rows];
            const newWs = xlsx.utils.aoa_to_sheet(finalData);
            wb.Sheets[sheetName] = newWs;
            xlsx.writeFile(wb, reportPath);
        }

        return NextResponse.json({
            success: true,
            numProg: numProg,
            folderPath: typeDir,
            filePath: filePath
        });
    } catch (error: any) {
        console.error('Error in save operation:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

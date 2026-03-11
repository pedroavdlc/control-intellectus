import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';

const BASE_STORAGE = "C:\\Users\\SO\\Videos\\archivos wed intellectus";
const FILE_CONTROL = "CONTROL DE GEOS Y SABANAS.xlsx";

export async function GET() {
    try {
        const controlPath = path.join(BASE_STORAGE, FILE_CONTROL);
        if (!fs.existsSync(controlPath)) {
            console.warn(`[ControlData] File not found: ${controlPath}`);
            return NextResponse.json({ success: true, data: [] });
        }

        let fileBuffer;
        try {
            console.log(`[ControlData] Attempting fs.readFileSync of ${controlPath}`);
            fileBuffer = fs.readFileSync(controlPath);
            console.log(`[ControlData] fs.readFileSync success, buffer length: ${fileBuffer.length}`);
        } catch (fsErr: any) {
            console.error('[ControlData] FS Read Error:', fsErr.code, fsErr.message);
            return NextResponse.json({ 
                success: false, 
                message: 'El sistema no puede leer el archivo físico. Verifique que no esté abierto o bloqueado.',
                error: fsErr.message 
            });
        }

        try {
            console.log(`[ControlData] Attempting xlsx.read`);
            const wb = xlsx.read(fileBuffer, { type: 'buffer' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = xlsx.utils.sheet_to_json(ws);
            console.log(`[ControlData] xlsx.read success, rows: ${data.length}`);
            return NextResponse.json({ success: true, data });
        } catch (xlsxErr: any) {
            console.error('[ControlData] XLSX Parse Error:', xlsxErr.message);
            return NextResponse.json({ 
                success: false, 
                message: 'Error al procesar el formato del archivo Excel.',
                error: xlsxErr.message 
            });
        }
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

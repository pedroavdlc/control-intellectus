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

        try {
            // Attempt to read the file
            const wb = xlsx.readFile(controlPath);
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = xlsx.utils.sheet_to_json(ws);

            return NextResponse.json({ success: true, data });
        } catch (readError: any) {
            console.error('[ControlData] Error reading Excel:', readError.message);
            // If locked, we might want to try reading a copy or just informing the user
            return NextResponse.json({ 
                success: false, 
                message: 'El archivo Excel maestro está bloqueado. Por favor, ciérrelo en su computadora para poder visualizar los datos en el sistema.',
                error: readError.message 
            }, { status: 200 }); // Return 200 so frontend can handle it nicely
        }
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

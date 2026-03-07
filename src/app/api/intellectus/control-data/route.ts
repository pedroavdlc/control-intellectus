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
            return NextResponse.json({ success: true, data: [] });
        }

        const wb = xlsx.readFile(controlPath);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(ws);

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

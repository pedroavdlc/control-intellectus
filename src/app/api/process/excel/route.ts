import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const workbook = xlsx.read(buffer, { type: 'buffer' });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        return NextResponse.json({
            success: true,
            data: data,
            columns: Object.keys(data[0] || {})
        });

    } catch (error: any) {
        console.error('Error processing Excel:', error);
        return NextResponse.json({
            error: 'Error al procesar el Excel',
            details: error.message
        }, { status: 500 });
    }
}

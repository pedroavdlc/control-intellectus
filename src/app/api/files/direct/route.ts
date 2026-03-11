import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const filePath = searchParams.get('path');

        if (!filePath || !fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Archivo no encontrado', path: filePath }, { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        const response = new NextResponse(fileBuffer);
        
        let mime = 'application/octet-stream';
        if (filePath.toLowerCase().endsWith('.pdf')) mime = 'application/pdf';
        if (filePath.toLowerCase().endsWith('.xlsx') || filePath.toLowerCase().endsWith('.xls')) mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        response.headers.set('Content-Type', mime);
        response.headers.set('Content-Disposition', `inline; filename="${fileName}"`);

        return response;
    } catch (error: any) {
        console.error('Error serving direct file:', error);
        return NextResponse.json({ error: 'Error al servir el archivo' }, { status: 500 });
    }
}

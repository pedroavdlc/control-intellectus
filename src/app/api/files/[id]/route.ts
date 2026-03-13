import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const fileRecord = await prisma.fileRecord.findUnique({
            where: { id }
        });

        if (!fileRecord) {
            return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
        }

        // Handle both relative and absolute paths
        const filePath = fileRecord.filePath.startsWith('/') 
            ? path.join(process.cwd(), fileRecord.filePath)
            : fileRecord.filePath;

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'El archivo físico no existe' }, { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);
        const response = new NextResponse(fileBuffer);

        response.headers.set('Content-Type', 'application/pdf');
        response.headers.set('Content-Disposition', `inline; filename="${fileRecord.fileName}"`);

        return response;
    } catch (error: any) {
        console.error('Error serving file:', error);
        return NextResponse.json({ error: 'Error al servir el archivo' }, { status: 500 });
    }
}

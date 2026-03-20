import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        const { prisma } = await import('@/lib/prisma');
        
        // Auto-backfill history if the table is empty
        const count = await (prisma as any).consultation.count();
        if (count === 0) {
            console.log('[ControlData] Backfilling consultations from historical locations...');
            const locations = await (prisma as any).location.findMany({
                include: { device: true },
                orderBy: { createdAt: 'desc' }
            });
            
            const map = new Map();
            for (const loc of locations) {
                const dateKey = loc.date ? loc.date.split(' ')[0] : 'Unknown';
                const key = `${loc.phone}-${dateKey}`;
                if (!map.has(key)) {
                    map.set(key, loc);
                    const company = loc.device?.provider || 'DESCONOCIDA';
                    await (prisma as any).consultation.create({
                        data: {
                            folio: loc.phone || 'S/N',
                            phone: loc.phone || '0000000000',
                            company: company,
                            date: loc.date,
                            author: 'SISTEMA (HISTÓRICO)',
                            type: 'GEO',
                            area: 'HISTORIAL',
                            result: 'POSITIVO',
                            creditsUsed: company.includes('AT&T') ? 2 : 1
                        }
                    });
                }
            }
        }

        const consults = await (prisma as any).consultation.findMany({
            orderBy: { createdAt: 'desc' }
        });

        // Parse to match Excel format for frontend compatibility
        const data = consults.map((c: any) => ({
            id: c.id,
            'Núm. prog.': c.numProg || 0,
            'folio': c.folio || '',
            'Teléfono': c.phone || '',
            'Fecha consulta': c.date || '',
            'Realizó la consulta': c.author || '',
            'Compañía': c.company || '',
            'Tipo de consulta': c.type || '',
            'Area solicitante': c.area || '',
            'Resultado\r\n(POS / NEG)': c.result || '',
            'Ubicación Archivo': c.filePath || ''
        }));

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { data: newData } = await req.json();
        const { prisma } = await import('@/lib/prisma');

        if (!newData || !Array.isArray(newData)) {
            return NextResponse.json({ success: false, message: 'Datos inválidos.' }, { status: 400 });
        }

        // Wipe and recreate to sync exactly as Excel did
        await (prisma as any).consultation.deleteMany({});
        
        const creates = newData.map((c: any) => ({
            numProg: parseInt(c['Núm. prog.']) || null,
            folio: c['folio'] || '',
            phone: c['Teléfono'] || '',
            date: c['Fecha consulta'] || '',
            author: c['Realizó la consulta'] || '',
            company: c['Compañía'] || '',
            type: c['Tipo de consulta'] || '',
            area: c['Area solicitante'] || '',
            result: c['Resultado\r\n(POS / NEG)'] || c['Resultado'] || '',
            filePath: c['Ubicación Archivo'] || ''
        }));
        
        await (prisma as any).consultation.createMany({ data: creates });

        return NextResponse.json({ success: true, message: 'Base de datos sincronizada.' });
    } catch (error: any) {
        console.error('[ControlData] Save Error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { id, result, folio } = await req.json();
        const { prisma } = await import('@/lib/prisma');
        
        if (!id || !result) {
            return NextResponse.json({ success: false, message: 'Faltan datos requeridos (id, result).' }, { status: 400 });
        }

        const dataToUpdate: any = { result: result };
        if (folio !== undefined) {
             dataToUpdate.folio = folio;
        }

        const updated = await (prisma as any).consultation.update({
            where: { id: id },
            data: dataToUpdate
        });

        // Parse to match frontend model
        const parsed = {
            id: updated.id,
            'Núm. prog.': updated.numProg || 0,
            'folio': updated.folio || '',
            'Teléfono': updated.phone || '',
            'Fecha consulta': updated.date || '',
            'Realizó la consulta': updated.author || '',
            'Compañía': updated.company || '',
            'Tipo de consulta': updated.type || '',
            'Area solicitante': updated.area || '',
            'Resultado\r\n(POS / NEG)': updated.result || '',
            'Ubicación Archivo': updated.filePath || ''
        };

        return NextResponse.json({ success: true, data: parsed });
    } catch (error: any) {
        console.error('[ControlData] Update Error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

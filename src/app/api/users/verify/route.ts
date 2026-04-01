import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json();
        
        if (!username || !password) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { username: username.toUpperCase() }
        });

        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        if (user.password !== password) {
            return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
        }

        return NextResponse.json({ success: true, user: { username: user.username, area: user.area } });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

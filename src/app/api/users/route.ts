import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, username: true, area: true, role: true }
        });
        return NextResponse.json(users);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { username, password, area, role } = await req.json();
        
        if (!username || !password) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { username: username.toUpperCase() }
        });

        if (existingUser) {
            return NextResponse.json({ error: 'El usuario ya existe' }, { status: 400 });
        }

        const newUser = await prisma.user.create({
            data: {
                username: username.toUpperCase(),
                password: password,
                area: area ? area.toUpperCase() : null,
                role: role || 'AGENT'
            }
        });

        // Don't send password back
        return NextResponse.json({ id: newUser.id, username: newUser.username, role: newUser.role });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const BASE_STORAGE = process.env.STORAGE_BASE || path.join(process.cwd(), 'storage');

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    const type = searchParams.get('type'); // 'GEO', 'SABANA', or null (open root phone folder)

    if (!phone) {
        return NextResponse.json({ success: false, error: 'Phone is required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const phoneDir = path.join(BASE_STORAGE, cleanPhone);

    let targetDir = phoneDir;
    if (type === 'GEO') {
        targetDir = path.join(phoneDir, 'GEOLOCALIZACIONES');
    } else if (type === 'SABANA') {
        targetDir = path.join(phoneDir, 'SABANAS');
    }

    // Create dir if it doesn't exist so explorer doesn't fail
    if (!fs.existsSync(targetDir)) {
        try {
            fs.mkdirSync(targetDir, { recursive: true });
        } catch (e) {
            // Ignore if it already exists
        }
    }

    return new Promise((resolve) => {
        // Use explorer.exe start to open folder - works on Windows only
        exec(`explorer.exe "${targetDir}"`, (err) => {
            if (err) {
                console.error('[OpenFolder] Error opening explorer:', err.message);
                resolve(NextResponse.json({ success: false, error: err.message }, { status: 500 }));
            } else {
                resolve(NextResponse.json({ success: true, path: targetDir }));
            }
        });
    });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        // Fetch all devices with their locations
        const devices = await prisma.device.findMany({
            include: {
                locations: {
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        const history: Record<string, any[]> = {};

        devices.forEach((device: any) => {
            history[device.phone] = device.locations.map((loc: any) => ({
                id: loc.id,
                lat: loc.lat,
                lng: loc.lng,
                antennaLat: loc.antennaLat,
                antennaLng: loc.antennaLng,
                radius: loc.radius,
                address: loc.address,
                date: loc.date,
                timestamp: loc.timestamp ? Number(loc.timestamp) : 0,
                antennaSector: loc.antennaSector ? JSON.parse(loc.antennaSector) : null,
                createdAt: loc.createdAt
            }));
        });

        return NextResponse.json({ success: true, history });
    } catch (error: any) {
        console.error('Error loading database history:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

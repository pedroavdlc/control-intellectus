import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const normalizePhone = (p: string) => {
    const clean = (p || '').replace(/\D/g, '');
    if (clean.length > 10 && clean.startsWith('52')) return clean.substring(2);
    if (clean.length > 10 && clean.startsWith('044')) return clean.substring(3);
    return clean;
};

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
        const providers: Record<string, string | null> = {};

        devices.forEach((device: any) => {
            const phoneStr = normalizePhone(String(device.phone));
            providers[phoneStr] = device.provider || providers[phoneStr] || null;
            
            const locs = device.locations.map((loc: any) => ({
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
                fileId: loc.fileId,
                createdAt: loc.createdAt
            }));

            if (!history[phoneStr]) {
                history[phoneStr] = locs;
            } else {
                history[phoneStr] = [...history[phoneStr], ...locs];
            }
        });

        // Sort each phone's history by createdAt desc after merging
        Object.keys(history).forEach(phone => {
            history[phone].sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        });

        // Fetch unique lists for autocomplete ordered by recency
        // Focus on most recent consultations first to extract authors/areas/companies
        const recentConsultations = await prisma.consultation.findMany({
            orderBy: { createdAt: 'desc' },
            select: { author: true, area: true, company: true, type: true }
        });

        // Helper to get unique values in order of appearance
        const getUniqueOrdered = (list: any[], key: string, geoPriority = false) => {
            const seen = new Set();
            const result: string[] = [];
            
            // First pass: GEOS if priority is requested
            if (geoPriority) {
                list.forEach(item => {
                    const val = item[key];
                    if (val && item.type === 'GEO' && !seen.has(val)) {
                        seen.add(val);
                        result.push(val);
                    }
                });
            }

            // Second pass (or first if no priority): Everything else
            list.forEach(item => {
                const val = item[key];
                if (val && !seen.has(val)) {
                    seen.add(val);
                    result.push(val);
                }
            });
            return result;
        };

        const authors = getUniqueOrdered(recentConsultations, 'author', true);
        const areas = getUniqueOrdered(recentConsultations, 'area');
        const companies = getUniqueOrdered(recentConsultations, 'company');


        return NextResponse.json({ 
            success: true, 
            history, 
            providers,
            authors: authors as string[],
            areas: areas as string[],
            companies: companies as string[]
        });
    } catch (error: any) {
        console.error('Error loading database history:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';

// Mexico (MCC=334) operator name lookup by MNC
const MNC_NAMES: Record<string, string> = {
    '20': 'TELCEL', '020': 'TELCEL',
    '50': 'AT&T', '050': 'AT&T',
    '90': 'AT&T', '090': 'AT&T',
    '3': 'MOVISTAR', '003': 'MOVISTAR',
    '10': 'ALTÁN', '010': 'ALTÁN',
    '30': 'MOVISTAR', '030': 'MOVISTAR',
    '40': 'UNEFON', '040': 'UNEFON',
};

function getCompanyName(mcc: string | number, mnc: string | number): string {
    if (String(mcc) === '334') {
        return MNC_NAMES[String(mnc)] || `MNC-${mnc}`;
    }
    return `${mcc}-${mnc}`;
}

// In-memory cache: 30 min TTL
const towerCache = new Map<string, { towers: any[]; ts: number }>();
const CACHE_TTL = 1000 * 60 * 30;

async function fetchCellsInBox(token: string, minLat: number, minLon: number, maxLat: number, maxLon: number): Promise<any[]> {
    const url = `https://opencellid.org/cell/getInArea?key=${token}&BBOX=${minLat.toFixed(6)},${minLon.toFixed(6)},${maxLat.toFixed(6)},${maxLon.toFixed(6)}&format=json`;
    try {
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) return [];
        const text = await res.text();
        const data = JSON.parse(text);
        return data.cells || [];
    } catch {
        return [];
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const token = process.env.OPENCELLID_TOKEN;

    if (!lat || !lon || !token) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const fLat = parseFloat(lat);
    const fLon = parseFloat(lon);
    const force = searchParams.get('force') === 'true';

    // Cache by rounded center (2dp ≈ 1km grid)
    const cacheKey = `${fLat.toFixed(2)},${fLon.toFixed(2)}`;
    const cached = towerCache.get(cacheKey);
    if (!force && cached && Date.now() - cached.ts < CACHE_TTL) {
        return NextResponse.json({ success: true, towers: cached.towers });
    }

    try {
        // Strategy: 5 small overlapping boxes covering up to ~1.5km in all directions.
        // Each box is 0.007° (~700m) radius, offset so together they cover a 1.5km circle.
        const r = 0.007;

        const boxes = [
            // Center box
            [fLat - r, fLon - r, fLat + r, fLon + r],
            // North
            [fLat + r * 0.3, fLon - r, fLat + r * 2.3, fLon + r],
            // South
            [fLat - r * 2.3, fLon - r, fLat - r * 0.3, fLon + r],
            // East
            [fLat - r, fLon + r * 0.3, fLat + r, fLon + r * 2.3],
            // West
            [fLat - r, fLon - r * 2.3, fLat + r, fLon - r * 0.3],
        ];

        // Fetch all boxes in parallel
        const results = await Promise.all(
            boxes.map(([minLat, minLon, maxLat, maxLon]) =>
                fetchCellsInBox(token, minLat, minLon, maxLat, maxLon)
            )
        );

        // Merge all cells, deduplicate by (mcc, mnc, lac, cellid)
        const allCells = results.flat();
        const uniqueCells = new Map<string, any>();
        for (const cell of allCells) {
            const key = `${cell.mcc}-${cell.mnc}-${cell.lac}-${cell.cellid}`;
            if (!uniqueCells.has(key)) {
                uniqueCells.set(key, cell);
            }
        }

        // Group by exact raw lat/lon from API (3dp = ~111m precision from free tier)
        const groupedTowers: Record<string, any> = {};
        for (const cell of uniqueCells.values()) {
            const cellLat = parseFloat(cell.lat);
            const cellLon = parseFloat(cell.lon);
            if (isNaN(cellLat) || isNaN(cellLon)) continue;

            // Use the raw string key (e.g. "20.636,-105.228") to group co-located sectors
            const key = `${cell.lat},${cell.lon}`;
            if (!groupedTowers[key]) {
                groupedTowers[key] = {
                    lat: cellLat,
                    lng: cellLon,
                    mcc: cell.mcc,
                    mnc: cell.mnc,
                    lac: cell.lac,
                    sectors: 1,
                };
            } else {
                groupedTowers[key].sectors++;
            }
        }

        const formattedTowers = Object.values(groupedTowers).map((tower: any, i: number) => {
            const companyName = getCompanyName(tower.mcc, tower.mnc);
            return {
                id: `tower-${i}`,
                lat: tower.lat,
                lng: tower.lng,
                label: `${companyName} | LAC: ${tower.lac} | Sectores: ${tower.sectors}`,
                company: companyName,
                mcc: tower.mcc,
                mnc: tower.mnc,
                lac: tower.lac,
                type: 'antenna' as const,
            };
        });

        towerCache.set(cacheKey, { towers: formattedTowers, ts: Date.now() });

        return NextResponse.json({ success: true, towers: formattedTowers });

    } catch (error: any) {
        return NextResponse.json({ success: false, towers: [], error: error.message }, { status: 500 });
    }
}

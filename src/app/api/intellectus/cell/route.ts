import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/intellectus/cell?mcc=334&mnc=20&lac=5635&cellid=36142873
 *
 * Looks up the EXACT antenna (BTS) in OpenCellID using the cell identifiers
 * extracted from the GEO PDF report. Returns the antenna's precise lat/lng
 * and metadata.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mcc = searchParams.get('mcc');
    const mnc = searchParams.get('mnc');
    const lac = searchParams.get('lac');
    const cellid = searchParams.get('cellid');
    const token = process.env.OPENCELLID_TOKEN;

    if (!mcc || !mnc || !lac || !cellid || !token) {
        return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    try {
        const url = `https://opencellid.org/cell/get?key=${token}&mcc=${mcc}&mnc=${mnc}&lac=${lac}&cellid=${cellid}&format=json`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });

        if (!res.ok) {
            return NextResponse.json({ success: false, error: `OpenCellID returned ${res.status}` }, { status: 502 });
        }

        const text = await res.text();
        let data: any;
        try { data = JSON.parse(text); }
        catch { return NextResponse.json({ success: false, error: 'Invalid JSON from OpenCellID' }, { status: 502 }); }

        // OpenCellID returns { lat, lon, range, samples, ... } on success
        // Some responses also include 'direction' (azimuth in degrees, 0=North, clockwise)
        if (data.error) {
            return NextResponse.json({ success: false, error: data.error });
        }

        const MNC_NAMES: Record<string, string> = {
            '20': 'TELCEL', '50': 'AT&T', '90': 'AT&T',
            '3': 'MOVISTAR', '10': 'ALTÁN', '30': 'MOVISTAR', '40': 'UNEFON',
        };
        const company = String(mcc) === '334' ? (MNC_NAMES[String(mnc)] || `MNC-${mnc}`) : `${mcc}-${mnc}`;

        // --- Azimuth / sector direction ---
        // 1. Use 'direction' from OpenCellID if present
        let azimuth: number | null = null;
        let azimuthSource: string = 'unknown';

        if (data.direction !== undefined && data.direction !== null && data.direction !== -1) {
            azimuth = parseInt(data.direction);
            azimuthSource = 'opencellid';
        } else {
            // Infer from Cell Identity structure:
            // LTE ECI (28-bit) = eNB-ID (20 bits) * 256 + cell-index (8 bits)
            //   cell-index 0 → azimuth ~0° (North)
            //   cell-index 1 → azimuth ~120°
            //   cell-index 2 → azimuth ~240°
            const cid = parseInt(String(cellid));
            const cellIndex = cid % 256;    // LTE: last byte = sector index
            const enbId = Math.floor(cid / 256);

            console.log(`[cell] CellID=${cid}  eNB-ID=${enbId}  cell-index=${cellIndex}`);

            if (cellIndex === 0 || cellIndex === 1 || cellIndex === 2) {
                // Standard 3-sector macro cell
                azimuth = cellIndex * 120;
                azimuthSource = 'inferred-lte';
            } else {
                // Non-standard: fall back to mod-3 approximation
                azimuth = (cid % 3) * 120;
                azimuthSource = 'inferred-mod3';
                console.warn(`[cell] Non-standard cell-index ${cellIndex}; using mod-3 fallback → azimuth ${azimuth}°`);
            }
        }

        return NextResponse.json({
            success: true,
            antenna: {
                lat: parseFloat(data.lat),
                lng: parseFloat(data.lon),
                range: data.range ? parseInt(data.range) : null, // coverage radius from DB
                samples: data.samples ? parseInt(data.samples) : null,
                mcc, mnc, lac, cellid,
                company,
                label: `${company} | LAC: ${lac} | CID: ${cellid}`,
                azimuth,          // degrees from North, clockwise (0=N, 90=E, 120=SE, 240=SW)
                azimuthSource,    // 'opencellid' | 'inferred-lte' | 'inferred-mod3' | 'unknown'
                sectorWidthDeg: 120, // standard 3-sector tower (120° per face)
            },
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

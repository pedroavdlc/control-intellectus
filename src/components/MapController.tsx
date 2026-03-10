'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface MapControllerProps {
    center: [number, number];
    zoom: number;
    flyTo?: [number, number] | null;  // fly camera here without affecting markers
    flyToZoom?: number;
}

export default function MapController({ center, zoom, flyTo, flyToZoom = 18 }: MapControllerProps) {
    const map = useMap();

    // Standard center tracking
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        if (map && center) {
            const currentCenter = map.getCenter();
            const dist = Math.sqrt(
                Math.pow(currentCenter.lat - center[0], 2) +
                Math.pow(currentCenter.lng - center[1], 2)
            );
            if (dist > 0.0001) {
                timeoutId = setTimeout(() => {
                    try { map.flyTo(center, zoom, { duration: 1.5, easeLinearity: 0.25 }); }
                    catch (e) { console.warn('Map move deferred:', e); }
                }, 100);
            }
        }
        return () => { if (timeoutId) clearTimeout(timeoutId); };
    }, [center, zoom, map]);

    // Camera-only fly (no marker side-effects)
    useEffect(() => {
        if (map && flyTo) {
            setTimeout(() => {
                try { map.flyTo(flyTo, flyToZoom, { duration: 1.2, easeLinearity: 0.25 }); }
                catch (e) { console.warn('FlyTo deferred:', e); }
            }, 50);
        }
    }, [flyTo, flyToZoom, map]);

    return null;
}

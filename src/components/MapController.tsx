'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface MapControllerProps {
    center: [number, number];
    zoom: number;
}

export default function MapController({ center, zoom }: MapControllerProps) {
    const map = useMap();

    useEffect(() => {
        map.flyTo(center, zoom, {
            duration: 1.5
        });
    }, [center, zoom, map]);

    return null;
}

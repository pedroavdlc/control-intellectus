'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import { MapMarker } from '@/types/map';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(m => m.Circle), { ssr: false });
const MapController = dynamic(() => import('./MapController'), { ssr: false });

interface MapProps {
    markers: MapMarker[];
    center?: [number, number];
    zoom?: number;
}

export default function Map({ markers, center = [19.4326, -99.1332], zoom = 10 }: MapProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        require('leaflet-defaulticon-compatibility');
        setIsClient(true);
    }, []);

    if (!isClient) return <div className="h-[500px] w-full bg-slate-900/50 animate-pulse rounded-3xl" />;

    return (
        <div className="w-full h-full glass rounded-3xl overflow-hidden min-h-[500px] border border-slate-700/50 relative shadow-2xl">
            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >
                <MapController center={center} zoom={zoom} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {markers.map((marker) => (
                    <div key={marker.id}>
                        <Marker position={[marker.lat, marker.lng]}>
                            <Popup>
                                <div className="p-2 min-w-[150px]">
                                    <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1">{marker.label}</h3>
                                    {marker.phone && <p className="text-indigo-600 font-bold text-sm">📞 {marker.phone}</p>}
                                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Lat: {marker.lat.toFixed(4)}, Lon: {marker.lng.toFixed(4)}</p>
                                </div>
                            </Popup>
                        </Marker>
                        {marker.radius && (
                            <Circle
                                center={[marker.lat, marker.lng]}
                                radius={marker.radius}
                                pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.15, weight: 1 }}
                            />
                        )}
                    </div>
                ))}
            </MapContainer>
        </div>
    );
}

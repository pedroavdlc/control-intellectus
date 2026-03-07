'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

// We need to dynamicly import Leatlet components for SSR
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(m => m.Circle), { ssr: false });

export interface MapMarker {
    id: string;
    lat: number;
    lng: number;
    label: string;
    phone?: string;
    radius?: number;
}

interface MapProps {
    markers: MapMarker[];
    center?: [number, number];
    zoom?: number;
}

export default function Map({ markers, center = [19.4326, -99.1332], zoom = 10 }: MapProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) return <div className="w-full h-full bg-slate-800 animate-pulse rounded-2xl flex items-center justify-center text-slate-400">Cargando Mapa...</div>;

    return (
        <div className="w-full h-full glass rounded-3xl overflow-hidden min-h-[500px] border border-slate-700/50 relative">
            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {markers.map((marker) => (
                    <div key={marker.id}>
                        <Marker position={[marker.lat, marker.lng]}>
                            <Popup>
                                <div className="p-1">
                                    <h3 className="font-bold text-slate-900">{marker.label}</h3>
                                    {marker.phone && <p className="text-secondary font-medium">Llamar: {marker.phone}</p>}
                                    <p className="text-xs text-slate-500 mt-1">Lat: {marker.lat.toFixed(4)}, Lon: {marker.lng.toFixed(4)}</p>
                                </div>
                            </Popup>
                        </Marker>
                        {marker.radius && (
                            <Circle
                                center={[marker.lat, marker.lng]}
                                radius={marker.radius}
                                pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.2 }}
                            />
                        )}
                    </div>
                ))}
            </MapContainer>
        </div>
    );
}

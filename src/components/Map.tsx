'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Circle,
    Polygon,
    Polyline,
    LayersControl,
    useMap
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import { MapMarker } from '@/types/map';
import MapController from './MapController';

// ─── Constants ───
const DEVICE_SIZE = 24;
const TOWER_SIZE = 40;

// ─── Utility Functions ───
function azimuthToCardinal(deg: number): string {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
    return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function createSectorPoints(clat: number, clng: number, az: number, r: number, hw: number = 60): [number, number][] {
    const points: [number, number][] = [[clat, clng]];
    const latF = 1 / 111111;
    const lngF = 1 / (111111 * Math.cos(clat * Math.PI / 180));
    for (let i = 0; i <= 32; i++) {
        const b = (az - hw + (i / 32) * (hw * 2)) * Math.PI / 180;
        points.push([clat + r * latF * Math.cos(b), clng + r * lngF * Math.sin(b)]);
    }
    points.push([clat, clng]);
    return points;
}

// ─── Icons ───
const ClusterIcon = (cluster: any) => L.divIcon({
    html: `<div style="width:34px;height:34px;border-radius:50%;background:rgba(59,130,246,0.85);border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:12px;box-shadow:0 2px 10px rgba(0,0,0,0.3);">${cluster.getChildCount()}</div>`,
    className: '', iconSize: [34, 34], iconAnchor: [17, 17]
});

const DeviceIcon = (color: string) => L.divIcon({
    html: `<div style="width:24px;height:24px;position:relative;display:flex;align-items:center;justify-content:center;"><div style="position:absolute;width:12px;height:12px;border-radius:50%;background:${color};box-shadow:0 0 10px ${color};z-index:2;"></div><div style="position:absolute;width:24px;height:24px;border-radius:50%;background:${color};opacity:0.2;animation:leaflet-ping 1.5s ease-out infinite;"></div></div>`,
    className: '', iconSize: [DEVICE_SIZE, DEVICE_SIZE], iconAnchor: [DEVICE_SIZE / 2, DEVICE_SIZE / 2], popupAnchor: [0, -DEVICE_SIZE / 2]
});

const InfrastructureIcon = L.divIcon({
    html: `<div style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));"><path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 22 4-10 4 10"/><path d="M12 18v4"/></svg></div>`,
    className: '', iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12]
});

// ─── Main Component ───
export default function Map(props: any) {
    const { markers, towerMarkers = [], showTowers, center, zoom, geoCompany, targetCenter, towerRange, cameraFlyTo, antennaSector, extraMarkers = [] } = props;
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
        return () => {
             setMounted(false);
             if (containerRef.current) containerRef.current.innerHTML = '';
        };
    }, []);

    const { genericTowers } = useMemo(() => {
        if (!showTowers || !towerMarkers.length) return { genericTowers: [] };
        const ref = targetCenter || center;
        return { genericTowers: towerMarkers.filter((t: any) => haversineDistance(ref[0], ref[1], t.lat, t.lng) <= (towerRange || 0)) };
    }, [towerMarkers, targetCenter, center, towerRange, showTowers]);

    if (!mounted) return <div className="w-full h-full bg-slate-900/50 animate-pulse rounded-3xl" style={{ minHeight: 500 }} />;

    return (
        <div ref={containerRef} className="w-full h-full relative z-0">
            <style>{`@keyframes leaflet-ping { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(1.8); opacity: 0; } } .leaflet-marker-icon { background: none !important; border: none !important; }`}</style>
            
            <MapContainer 
                key={`map-inst-${center[0]}-${center[1]}`}
                center={center} 
                zoom={zoom} 
                scrollWheelZoom={true} 
                zoomControl={false}
                style={{ height: '100%', width: '100%' }}
            >
                <LayersControl position="topright">
                    <LayersControl.BaseLayer name="OpenStreetMap" checked>
                        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Calles (Google)">
                        <TileLayer attribution="&copy; Google Maps" url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Calles Grises (Discovery)">
                        <TileLayer attribution="&copy; OpenStreetMap &copy; CartoDB" url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Satélite">
                        <TileLayer attribution="&copy; Google Maps" url="https://mt1.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}" />
                    </LayersControl.BaseLayer>
                </LayersControl>

                {showTowers && targetCenter && towerRange > 0 && (
                    <Circle center={targetCenter} radius={towerRange} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.02, weight: 1, dashArray: '8, 8' }} />
                )}

                {showTowers && genericTowers.length > 0 && (
                    <MarkerClusterGroup iconCreateFunction={ClusterIcon} maxClusterRadius={40}>
                        {genericTowers.map((tower: any) => (
                            <Marker key={tower.id} position={[tower.lat, tower.lng]} icon={InfrastructureIcon}>
                                <Popup>
                                    <div className="p-3 bg-slate-950 border border-white/10 rounded-xl">
                                        <p className="text-blue-400 font-black text-[11px]">{tower.company || 'Antena'}</p>
                                        <p className="text-slate-400 text-[10px]">{tower.label}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MarkerClusterGroup>
                )}

                {markers.map((m: any) => {
                    if (m.type === 'antenna') return null;
                    const isViewed = m.id === 'viewed';
                    const color = isViewed ? '#6366f1' : '#10b981';
                    return (
                        <React.Fragment key={m.id}>
                            {m.radius && <Circle center={[m.lat, m.lng]} radius={m.radius} pathOptions={{ color, fillColor: color, fillOpacity: isViewed ? 0.12 : 0.08, weight: isViewed ? 2 : 1, dashArray: isViewed ? undefined : '5, 5' }} />}
                            <Marker position={[m.lat, m.lng]} icon={DeviceIcon(color)} zIndexOffset={isViewed ? 1000 : 500} />
                        </React.Fragment>
                    );
                })}

                {antennaSector && (() => {
                    const hw = (antennaSector.widthDeg ?? 120) / 2;
                    const pts = createSectorPoints(antennaSector.lat, antennaSector.lng, antennaSector.azimuth, antennaSector.range, hw);
                    const isConf = antennaSector.azimuthSource === 'opencellid';
                    return (
                        <React.Fragment>
                            <Circle center={[antennaSector.lat, antennaSector.lng]} radius={antennaSector.range} pathOptions={{ color: '#ef4444', fillOpacity: 0, weight: 1, dashArray: '6 4' }} />
                            <Polygon positions={pts} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: isConf ? 0.3 : 0.18, weight: 2, dashArray: isConf ? undefined : '8 4' }} />
                        </React.Fragment>
                    );
                })()}

                {extraMarkers.length > 1 && <Polyline positions={extraMarkers.map((m: any) => [m.lat, m.lng])} pathOptions={{ color: '#06b6d4', weight: 3, dashArray: '8, 12', opacity: 0.6 }} />}

                {extraMarkers.map((m: any, idx: number) => {
                    const isRecent = idx === 0;
                    const color = isRecent ? '#6366f1' : '#22d3ee';
                    const sector = m.antennaSector;
                    return (
                        <React.Fragment key={`ex-${idx}`}>
                            {sector && <Polygon positions={createSectorPoints(sector.lat, sector.lng, sector.azimuth, sector.range, (sector.widthDeg || 120) / 2)} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: isRecent ? 0.25 : 0.12, weight: 1, dashArray: '4 4' }} />}
                            {m.radius && <Circle center={[m.lat, m.lng]} radius={Number(m.radius)} pathOptions={{ color, fillColor: color, fillOpacity: isRecent ? 0.22 : 0.15, weight: 1.5 }} />}
                            <Marker position={[m.lat, m.lng]} icon={DeviceIcon(color)} />
                        </React.Fragment>
                    );
                })}

                <MapController center={center} zoom={zoom} flyTo={cameraFlyTo} flyToZoom={18} />
                
                {/* Repositioned Zoom Control */}
                <div className="leaflet-bottom leaflet-right" style={{ marginBottom: '130px' }}>
                     <div className="leaflet-control-zoom leaflet-bar leaflet-control">
                          <a className="leaflet-control-zoom-in" href="#" title="Zoom in" role="button" aria-label="Zoom in">+</a>
                          <a className="leaflet-control-zoom-out" href="#" title="Zoom out" role="button" aria-label="Zoom out">−</a>
                     </div>
                </div>
            </MapContainer>
        </div>
    );
}

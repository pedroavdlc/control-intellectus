'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Circle,
    Polygon,
    Polyline,
    LayersControl
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import { MapMarker } from '@/types/map';
import MapController from './MapController';

// ─── Constants ────────────────────────────────────────────────────────────────
const DEVICE_SIZE = 24;
const TOWER_SIZE = 40;

// ─── Azimuth → cardinal direction ─────────────────────────────────────────────
function azimuthToCardinal(deg: number): string {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
    return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const toRad = (d: number) => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Sector polygon (pie slice) ───────────────────────────────────────────────
// azimuthDeg: direction antenna faces (0=North, 90=East, clockwise)
// radiusM: coverage radius
// halfWidthDeg: half the sector angle (60 → 120° total sector)
function createSectorPoints(
    centerLat: number,
    centerLng: number,
    azimuthDeg: number,
    radiusM: number,
    halfWidthDeg: number = 60,
    steps: number = 32
): [number, number][] {
    const points: [number, number][] = [[centerLat, centerLng]];
    const startBearing = azimuthDeg - halfWidthDeg;
    const endBearing = azimuthDeg + halfWidthDeg;
    const latFactor = 1 / 111111;
    const lngFactor = 1 / (111111 * Math.cos(centerLat * Math.PI / 180));

    for (let i = 0; i <= steps; i++) {
        const bearing = (startBearing + (i / steps) * (endBearing - startBearing)) * Math.PI / 180;
        const lat = centerLat + radiusM * latFactor * Math.cos(bearing);
        const lng = centerLng + radiusM * lngFactor * Math.sin(bearing);
        points.push([lat, lng]);
    }
    points.push([centerLat, centerLng]); // close back to antenna
    return points;
}

// ─── Cluster icon ─────────────────────────────────────────────────────────────
const createClusterCustomIcon = (cluster: any) => L.divIcon({
    html: `<div style="
        width:34px;height:34px;border-radius:50%;
        background:rgba(59,130,246,0.85);
        border:2px solid rgba(255,255,255,0.5);
        display:flex;align-items:center;justify-content:center;
        color:white;font-weight:900;font-size:12px;
        box-shadow:0 2px 10px rgba(59,130,246,0.4);
        font-family:system-ui,sans-serif;
    ">${cluster.getChildCount()}</div>`,
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17]
});

// ─── Device icon ──────────────────────────────────────────────────────────────
const createDeviceIcon = (colorHex: string) => L.divIcon({
    html: `
      <div style="width:24px;height:24px;position:relative;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:12px;height:12px;border-radius:50%;background:${colorHex};box-shadow:0 0 10px ${colorHex};z-index:2;"></div>
        <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:${colorHex};opacity:0.2;animation:leaflet-ping 1.5s ease-out infinite;"></div>
      </div>`,
    className: '',
    iconSize: [DEVICE_SIZE, DEVICE_SIZE],
    iconAnchor: [DEVICE_SIZE / 2, DEVICE_SIZE / 2],
    popupAnchor: [0, -DEVICE_SIZE / 2]
});

// ─── Red antenna icon (GEO report BTS) ───────────────────────────────────────
const antennaIcon = L.divIcon({
    html: `
      <div style="width:${TOWER_SIZE}px;height:${TOWER_SIZE}px;position:relative;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:${TOWER_SIZE}px;height:${TOWER_SIZE}px;border-radius:50%;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);animation:leaflet-ping 2s ease-out infinite;"></div>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));position:relative;z-index:10;">
          <path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 22 4-10 4 10"/><path d="M12 18v4"/>
        </svg>
      </div>`,
    className: '',
    iconSize: [TOWER_SIZE, TOWER_SIZE],
    iconAnchor: [TOWER_SIZE / 2, TOWER_SIZE / 2],
    popupAnchor: [0, -TOWER_SIZE / 2]
});

// ─── Highlighted source antenna (matches GEO company) ─────────────────────────
const sourceAntennaIcon = L.divIcon({
    html: `
      <div style="width:42px;height:42px;position:relative;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:42px;height:42px;border-radius:50%;background:rgba(251,146,60,0.15);border:2px solid rgba(251,146,60,0.5);animation:leaflet-ping 1.2s ease-out infinite;"></div>
        <div style="position:absolute;width:28px;height:28px;border-radius:50%;background:rgba(251,146,60,0.1);"></div>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fb923c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 2px 8px rgba(251,146,60,0.8));position:relative;z-index:10;">
          <path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 22 4-10 4 10"/><path d="M12 18v4"/>
        </svg>
      </div>`,
    className: '',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -21]
});

// ─── Blue infrastructure tower ────────────────────────────────────────────────
const staticTowerIcon = L.divIcon({
    html: `
      <div style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));">
          <path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 22 4-10 4 10"/><path d="M12 18v4"/>
        </svg>
      </div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
});

// ─── Props ────────────────────────────────────────────────────────────────────
interface MapProps {
    markers: MapMarker[];
    towerMarkers?: MapMarker[];
    showTowers?: boolean;
    center?: [number, number];
    zoom?: number;
    geoCompany?: string | null;
    targetCenter?: [number, number];
    towerRange?: number;
    cameraFlyTo?: [number, number] | null;
    antennaSector?: {
        lat: number; lng: number;
        azimuth: number;      // degrees from North, clockwise
        range: number;        // meters
        widthDeg: number;     // total sector width (usually 120)
        azimuthSource: string;
    } | null;
    extraMarkers?: MapMarker[];
}

const FILTER_RADIUS_M = 1000; // max fetch radius from API

export default function Map({
    markers,
    towerMarkers = [],
    showTowers = false,
    center = [19.4326, -99.1332],
    zoom = 10,
    geoCompany = null,
    targetCenter,
    towerRange = 0,
    cameraFlyTo = null,
    antennaSector = null,
    extraMarkers = [],
}: MapProps) {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => { setIsClient(true); }, []);

    // Classify towers:
    // - sourceTower: the single closest tower matching the GEO company (always shown)
    // - genericTowers: all OTHER towers within the selected towerRange (shown when range > 0)
    const { sourceTower, genericTowers } = useMemo(() => {
        const ref = targetCenter || center;

        // Find all towers that match the company within the fetch radius
        const matchingTowers = geoCompany
            ? towerMarkers.filter(t => {
                const tCompany = (t as any).company as string | undefined;
                return tCompany &&
                    (tCompany.includes(geoCompany) || geoCompany.includes(tCompany)) &&
                    haversineDistance(ref[0], ref[1], t.lat, t.lng) <= FILTER_RADIUS_M;
            })
            : [];

        // Pick ONLY the single closest matching tower as the source
        let sourceTower: MapMarker | null = null;
        if (matchingTowers.length > 0) {
            sourceTower = matchingTowers.reduce((best, t) =>
                haversineDistance(ref[0], ref[1], t.lat, t.lng) <
                    haversineDistance(ref[0], ref[1], best.lat, best.lng) ? t : best
            );
        }

        // Generic towers: everything within the chosen range EXCEPT the source tower
        const generic = towerRange > 0
            ? towerMarkers.filter(t => {
                if (sourceTower && t.id === sourceTower.id) return false; // exclude source
                return haversineDistance(ref[0], ref[1], t.lat, t.lng) <= towerRange;
            })
            : [];

        return { sourceTower, genericTowers: generic };
    }, [towerMarkers, targetCenter, center, geoCompany, towerRange]);

    if (!isClient) return (
        <div style={{ height: 500 }} className="w-full bg-slate-900/50 animate-pulse rounded-3xl" />
    );

    return (
        <div className="w-full h-full glass rounded-3xl overflow-hidden min-h-[500px] border border-slate-700/50 relative shadow-2xl">
            <style>{`
                @keyframes leaflet-ping {
                    0%   { transform: scale(0.8); opacity: 0.8; }
                    100% { transform: scale(1.8); opacity: 0; }
                }
                .leaflet-marker-icon { background: none !important; border: none !important; }
            `}</style>

            <MapContainer
                key="intellectus-map-v5"
                center={center}
                zoom={zoom}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >
                <LayersControl position="topright">
                    <LayersControl.BaseLayer name="Calles (Google)" checked>
                        <TileLayer
                            attribution="&copy; Google Maps"
                            url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Satélite">
                        <TileLayer
                            attribution="&copy; Google Maps"
                            url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
                            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="OpenStreetMap">
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                    </LayersControl.BaseLayer>
                </LayersControl>

                {/* ── Range reference circle ── */}
                {showTowers && targetCenter && towerRange > 0 && (
                    <Circle
                        center={targetCenter}
                        radius={towerRange}
                        pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.02, weight: 1, dashArray: '8, 8' }}
                    />
                )}

                {/* ── Generic infrastructure towers (blue, clustered) ── */}
                {showTowers && genericTowers.length > 0 && (
                    <MarkerClusterGroup
                        iconCreateFunction={createClusterCustomIcon}
                        maxClusterRadius={40}
                        spiderfyOnMaxZoom={true}
                        showCoverageOnHover={false}
                        zoomToBoundsOnClick={true}
                        disableClusteringAtZoom={16}
                    >
                        {genericTowers.map((tower) => (
                            <Marker key={tower.id} position={[tower.lat, tower.lng]} icon={staticTowerIcon}>
                                <Popup>
                                    <div className="p-3 min-w-[160px] bg-slate-950 border border-white/10 rounded-xl shadow-2xl">
                                        <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            <h4 className="text-[10px] font-black text-white uppercase tracking-wider">Antena</h4>
                                        </div>
                                        <p className="text-blue-400 font-black text-[11px] mb-1">{(tower as any).company || 'Desconocida'}</p>
                                        <p className="text-slate-400 text-[10px]">{tower.label}</p>
                                        <span className="text-[8px] bg-blue-500/10 px-1.5 py-0.5 rounded text-blue-300 font-bold">OpenCellID</span>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MarkerClusterGroup>
                )}


                {/* ── Target device markers ── */}
                {markers.map((marker) => {
                    const isAntenna = marker.type === 'antenna';
                    if (isAntenna) return null; // Favor the sector wedge visualization

                    const colorHex = marker.id === 'viewed' ? '#6366f1' : '#10b981';
                    const icon = createDeviceIcon(colorHex);

                    return (
                        <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={icon} zIndexOffset={1000}>
                            <Popup>
                                <div className="p-3 min-w-[180px] bg-slate-950 border border-white/10 rounded-xl shadow-2xl">
                                    <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
                                        <div style={{ backgroundColor: colorHex }} className="w-2 h-2 rounded-full" />
                                        <h3 className="font-black text-white text-[11px] uppercase tracking-wider">{marker.label}</h3>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Lat: <span className="text-slate-200">{marker.lat.toFixed(6)}</span></p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Lng: <span className="text-slate-200">{marker.lng.toFixed(6)}</span></p>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}


                {/* ── Signal sector wedge (red pie slice = face of the antenna that received the signal) ── */}
                {antennaSector && (() => {
                    const halfWidth = (antennaSector.widthDeg ?? 120) / 2;
                    const sectorPoints = createSectorPoints(
                        antennaSector.lat,
                        antennaSector.lng,
                        antennaSector.azimuth,
                        antennaSector.range,
                        halfWidth
                    );
                    const isConfirmed = antennaSector.azimuthSource === 'opencellid';
                    return (
                        <React.Fragment>
                            {/* Full radius circle (dashed outline) */}
                            <Circle
                                center={[antennaSector.lat, antennaSector.lng]}
                                radius={antennaSector.range}
                                pathOptions={{ color: '#ef4444', fillColor: 'transparent', fillOpacity: 0, weight: 1.5, dashArray: '6 4' }}
                            />
                            {/* Sector wedge */}
                            <Polygon
                                positions={sectorPoints}
                                pathOptions={{
                                    color: '#ef4444',
                                    fillColor: '#ef4444',
                                    fillOpacity: isConfirmed ? 0.30 : 0.18,
                                    weight: 2,
                                    dashArray: isConfirmed ? undefined : '8 4'
                                }}
                            >
                                <Popup>
                                    <div style={{ background: '#0a0f1e', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: 12, minWidth: 200 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', boxShadow: '0 0 8px rgba(239,68,68,0.8)' }} />
                                            <span style={{ fontSize: 10, fontWeight: 900, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sector de la Antena</span>
                                        </div>
                                        <div style={{ fontSize: 10, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Azimuth</span>
                                                <span style={{ color: '#fff', fontWeight: 900 }}>{antennaSector.azimuth}° ({azimuthToCardinal(antennaSector.azimuth)})</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Radio</span>
                                                <span style={{ color: '#fff', fontWeight: 900 }}>{antennaSector.range}m</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Apertura</span>
                                                <span style={{ color: '#fff', fontWeight: 900 }}>{antennaSector.widthDeg}°</span>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: 8, padding: '4px 8px', borderRadius: 6, background: isConfirmed ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${isConfirmed ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                                            <span style={{ fontSize: 8, fontWeight: 900, color: isConfirmed ? '#6ee7b7' : '#fcd34d', textTransform: 'uppercase' }}>
                                                {isConfirmed ? '✓ Confirmado por OpenCellID' : '⚠ Dirección estimada — verificar'}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: 8, color: '#64748b', marginTop: 6 }}>El dispositivo se encuentra en el área roja</p>
                                    </div>
                                </Popup>
                            </Polygon>
                        </React.Fragment>
                    );
                })()}

                {/* ── Route Polyline (only if extraMarkers present) ── */}
                {extraMarkers.length > 1 && (
                    <Polyline
                        positions={extraMarkers.map(m => [m.lat, m.lng])}
                        pathOptions={{ color: '#06b6d4', weight: 3, dashArray: '8, 12', opacity: 0.6 }}
                    />
                )}

                {/* ── Extra markers (show all mode) ── */}
                {extraMarkers.map((marker, idx) => (
                    <Marker key={`extra-${idx}`} position={[marker.lat, marker.lng]} icon={createDeviceIcon('#22d3ee')}>
                        <Popup>
                            <div className="p-3 min-w-[140px] bg-slate-950 border border-cyan-500/20 rounded-xl shadow-2xl">
                                <div className="flex items-center gap-2 mb-2 border-b border-cyan-500/10 pb-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                                    <h4 className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">Historial</h4>
                                </div>
                                <p className="text-white font-bold text-[11px] mb-1">{marker.label}</p>
                                <div className="text-[9px] text-slate-500 flex flex-col gap-0.5 mt-1">
                                    <span>Lat: {marker.lat.toFixed(5)}</span>
                                    <span>Lng: {marker.lng.toFixed(5)}</span>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                <MapController center={center} zoom={zoom} flyTo={cameraFlyTo} flyToZoom={18} />
            </MapContainer>
        </div>
    );
}

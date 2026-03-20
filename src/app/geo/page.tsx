'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MapMarker, LocationPoint } from '@/types/map';
import { Maximize, Navigation, Filter, Compass, AlertTriangle, Users, X, Edit3, Radio, Phone, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';

const Map = dynamic(() => import('@/components/Map'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-[#09090b] animate-pulse flex items-center justify-center text-slate-500 font-medium font-sans border border-white/5 rounded-[2.5rem]">Inicializando Motor de Mapas Conjunto...</div>
});

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function GeoPage() {
    const [history, setHistory] = useState<Record<string, LocationPoint[]>>({});
    const [aliases, setAliases] = useState<Record<string, string>>({});
    const [showAliasPanel, setShowAliasPanel] = useState(false);
    const [focusPoint, setFocusPoint] = useState<[number, number] | null>(null);
    const [clickedSector, setClickedSector] = useState<any>(null);
    const [showCollisionSectors, setShowCollisionSectors] = useState(false);

    useEffect(() => {
        async function loadHistory() {
            try {
                const res = await fetch('/api/intellectus/history');
                const result = await res.json();
                if (result.success && result.history) {
                    setHistory(result.history);
                }
            } catch (e) {
                console.error('Failed to load history:', e);
            }
        }
        loadHistory();

        const savedAliases = localStorage.getItem('intellectus_aliases');
        if (savedAliases) {
            try { setAliases(JSON.parse(savedAliases)); } catch (e) { console.error(e); }
        }
    }, []);

    const updateAlias = (phone: string, alias: string) => {
        const newAliases = { ...aliases, [phone]: alias };
        setAliases(newAliases);
        localStorage.setItem('intellectus_aliases', JSON.stringify(newAliases));
    };

    const markers: MapMarker[] = useMemo(() => {
        let allMarkers: MapMarker[] = [];
        Object.keys(history).forEach(phone => {
            const displayName = aliases[phone] ? `${aliases[phone]} (${phone})` : phone;
            history[phone].forEach(p => {
                // Filtro básico para México: Latitudes aprox 14 a 33, Longitudes aprox -118 a -86
                if (p.lat > 14 && p.lat < 33 && p.lng > -118 && p.lng < -86) {
                    allMarkers.push({
                        id: p.id + phone,
                        lat: p.lat,
                        lng: p.lng,
                        label: `${displayName} • ${p.date?.split(' ')[0] || ''}`,
                        phone: phone,
                        radius: 100,
                        antennaSector: p.antennaSector ? (typeof p.antennaSector === 'string' ? JSON.parse(p.antennaSector) : p.antennaSector) : null
                    } as any);
                }
            });
        });
        return allMarkers;
    }, [history, aliases]);

    const collisions = useMemo(() => {
        const found: any[] = [];
        const phones = Object.keys(history);
        for (let i = 0; i < phones.length; i++) {
            for (let j = i + 1; j < phones.length; j++) {
                const phoneA = phones[i];
                const phoneB = phones[j];
                const ptsA = history[phoneA];
                const ptsB = history[phoneB];

                ptsA.forEach(pA => {
                    // Filtro México
                    if (!(pA.lat > 14 && pA.lat < 33 && pA.lng > -118 && pA.lng < -86)) return;
                    
                    ptsB.forEach(pB => {
                        // Filtro México
                        if (!(pB.lat > 14 && pB.lat < 33 && pB.lng > -118 && pB.lng < -86)) return;
                        
                        const dist = haversineDistance(pA.lat, pA.lng, pB.lat, pB.lng);
                        if (dist <= 500) { // 500 metros
                            found.push({
                                pA: phoneA, pB: phoneB, dist: Math.round(dist),
                                lat: (pA.lat + pB.lat) / 2, lng: (pA.lng + pB.lng) / 2,
                                dateA: pA.date, dateB: pB.date,
                                sectorA: pA.antennaSector, sectorB: pB.antennaSector
                            });
                        }
                    });
                });
            }
        }
        const unique = found.reduce((acc, curr) => {
            const key = `${curr.pA}-${curr.pB}`;
            if (!acc[key] || acc[key].dist > curr.dist) acc[key] = curr;
            return acc;
        }, {});
        return Object.values(unique).sort((a: any, b: any) => a.dist - b.dist);
    }, [history]);

    const mapCenter = useMemo(() => {
        if (focusPoint) return focusPoint;
        return [19.4326, -99.1332] as [number, number]; // Default CDMX
    }, [focusPoint]);

    const activeSectors = useMemo(() => {
        if (!showCollisionSectors) return [];
        const sectors = new Set<any>();
        collisions.forEach((c: any) => {
            if (c.sectorA) sectors.add(c.sectorA);
            if (c.sectorB) sectors.add(c.sectorB);
        });
        return Array.from(sectors);
    }, [collisions, showCollisionSectors]);

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-6 relative">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Monitor Geospacial</h1>
                    <p className="text-slate-400 text-lg font-medium">Radar conjunto y alertas de proximidad</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setShowAliasPanel(!showAliasPanel)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${showAliasPanel ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                    >
                        <Users size={16} /> Contactos y Nombres
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-6 min-h-0">
                
                {/* Panel lateral: Alertas o Alias */}
                <div className="w-[350px] flex flex-col gap-4 overflow-y-auto no-scrollbar relative z-10 shrink-0">
                    
                    {showAliasPanel ? (
                        <div className="glass p-5 rounded-3xl border border-white/5 bg-zinc-950/80 h-full flex flex-col">
                            <h3 className="text-sm font-black tracking-widest uppercase text-blue-400 mb-4 flex items-center gap-2"><Edit3 size={16} /> Identificadores</h3>
                            <div className="space-y-4 overflow-auto flex-1 pr-2">
                                {Object.keys(history).map(phone => (
                                    <div key={phone} className="flex flex-col gap-2 p-3 bg-zinc-900/50 rounded-2xl border border-white/5">
                                        <span className="text-xs font-mono font-bold text-zinc-400">{phone}</span>
                                        <input
                                            type="text"
                                            placeholder="Asignar nombre..."
                                            value={aliases[phone] || ''}
                                            onChange={(e) => updateAlias(phone, e.target.value)}
                                            className="w-full bg-[#09090b] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none placeholder-zinc-700"
                                        />
                                    </div>
                                ))}
                                {Object.keys(history).length === 0 && <p className="text-zinc-600 text-[10px] uppercase text-center mt-10">Sin registros</p>}
                            </div>
                        </div>
                    ) : (
                        <div className="glass p-5 rounded-3xl border border-white/5 bg-zinc-950/80 h-full flex flex-col overflow-hidden">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center border border-rose-500/20">
                                    <AlertTriangle size={20} className={collisions.length > 0 ? 'animate-pulse' : ''} />
                                </div>
                                <div>
                                    <h4 className="text-white font-black text-sm uppercase tracking-widest">Colisiones</h4>
                                    <p className="text-[10px] text-zinc-500 font-bold tracking-widest">A &lt; 500 Metros</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                                {collisions.length > 0 ? collisions.map((c: any, i: number) => {
                                    const aliasA = aliases[c.pA] || c.pA;
                                    const aliasB = aliases[c.pB] || c.pB;
                                    return (
                                        <button 
                                            key={i} 
                                            onClick={() => setFocusPoint([c.lat, c.lng])}
                                            className="w-full text-left p-4 rounded-2xl bg-rose-950/30 border border-rose-900/50 hover:bg-rose-900/40 transition-all group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-white">{aliasA}</span>
                                                    <span className="text-[9px] text-zinc-500 font-mono">{c.pA}</span>
                                                </div>
                                                <div className="w-8 flex justify-center -mt-1"><AlertTriangle size={14} className="text-rose-500 opacity-50" /></div>
                                                <div className="flex flex-col text-right">
                                                    <span className="text-xs font-black text-white">{aliasB}</span>
                                                    <span className="text-[9px] text-zinc-500 font-mono">{c.pB}</span>
                                                </div>
                                            </div>
                                            <div className="bg-[#09090b]/50 p-2 rounded-lg flex justify-between items-center text-[10px]">
                                                <span className="text-rose-400 font-bold uppercase">Dist: {c.dist}m</span>
                                                <span className="text-zinc-500 font-medium">Click para ver</span>
                                            </div>
                                        </button>
                                    );
                                }) : (
                                    <div className="h-40 flex flex-col items-center justify-center text-center px-4">
                                        <Compass size={32} className="text-zinc-700 mb-2 opacity-50" />
                                        <p className="text-xs text-zinc-500 font-medium leading-relaxed">No se detectaron encuentros entre objetivos en las búsquedas registradas.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Mapa Principal */}
                <div className="flex-1 relative rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
                    <div className="absolute inset-0 z-0">
                        <Map 
                          markers={markers} 
                          center={mapCenter} 
                          zoom={focusPoint ? 16 : (collisions.length > 0 ? 14 : 11)} 
                          targetCenter={focusPoint} 
                          cameraFlyTo={focusPoint}
                          antennaSector={clickedSector}
                          antennaSectors={activeSectors}
                          onMarkerClick={(m: any) => {
                              if (m.antennaSector) {
                                  const mRad = Number(m.radius);
                                  const sRange = Number(m.antennaSector.range);
                                  const sec = (m.radius != null && !isNaN(mRad)) ? { ...m.antennaSector, range: Math.min(sRange, mRad) } : m.antennaSector;
                                  setClickedSector((prev: any) => prev && JSON.stringify(prev) === JSON.stringify(sec) ? null : sec);
                              } else {
                                  setClickedSector(null);
                              }
                              setFocusPoint([m.lat, m.lng]);
                          }}
                        />
                    </div>

                    <div className="absolute top-6 right-6 z-10 flex flex-col gap-3">
                        <MapButton icon={Maximize} />
                        <MapButton icon={Navigation} onClick={() => setFocusPoint(null)} />
                        <MapButton icon={Radio} active={showCollisionSectors} onClick={() => setShowCollisionSectors(!showCollisionSectors)} />
                    </div>
                    
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
                         <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 px-6 py-2 rounded-full shadow-2xl flex items-center gap-4">
                             <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
                             <span className="text-[10px] font-black tracking-widest uppercase text-blue-100">{markers.length} Puntos Históricos Mapeados</span>
                         </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function MapButton({ icon: Icon, active, onClick }: any) {
    return (
        <button 
           onClick={onClick}
           className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-2xl backdrop-blur-md border ${
                active ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-600/20' : 'bg-zinc-900/80 text-zinc-400 border-white/5 hover:bg-zinc-800 hover:text-white'
            }`}
        >
            <Icon size={20} />
        </button>
    );
}

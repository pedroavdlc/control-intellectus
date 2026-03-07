'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MapMarker, LocationPoint } from '@/types/map';
import { Map as MapIcon, Layers, Maximize, Navigation, PhoneCall, Filter, Compass } from 'lucide-react';

const Map = dynamic(() => import('@/components/Map'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-900/50 animate-pulse flex items-center justify-center text-slate-500 font-medium font-sans">Inicializando Motor de Mapas...</div>
});

export default function GeoPage() {
    const [history, setHistory] = useState<Record<string, LocationPoint[]>>({});
    const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
    const [viewedPoint, setViewedPoint] = useState<[number, number] | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('intellectus_history');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setHistory(parsed);
                const phones = Object.keys(parsed);
                if (phones.length > 0) setSelectedPhone(phones[0]);
            } catch (e) { console.error(e); }
        }
    }, []);

    const markers: MapMarker[] = useMemo(() => {
        if (!selectedPhone || !history[selectedPhone]) return [];
        return history[selectedPhone].map(p => ({
            id: p.id, lat: p.lat, lng: p.lng, label: p.address, phone: p.phone, radius: 500
        }));
    }, [history, selectedPhone]);

    const mapCenter = useMemo(() => {
        if (viewedPoint) return viewedPoint;
        if (markers.length > 0) return [markers[0].lat, markers[0].lng] as [number, number];
        return [19.4326, -99.1332] as [number, number];
    }, [markers, viewedPoint]);

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-6 relative">
            <div className="flex items-center justify-between">
                <div className="animate-in fade-in slide-in-from-left-4 duration-700">
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Monitor Geoespacial</h1>
                    <p className="text-slate-400 text-lg font-medium">Visualización de puntos en tiempo real</p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-1 px-4 flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dispositivo:</span>
                        <select
                            className="bg-transparent text-white font-bold text-sm outline-none cursor-pointer"
                            value={selectedPhone || ''}
                            onChange={(e) => setSelectedPhone(e.target.value)}
                        >
                            {Object.keys(history).map(phone => (
                                <option key={phone} value={phone} className="bg-slate-900">{phone}</option>
                            ))}
                            {!Object.keys(history).length && <option>Sin dispositivos</option>}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex-1 relative rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl group">
                <div className="absolute inset-0 z-0">
                    <Map markers={markers} center={mapCenter} zoom={16} />
                </div>

                {/* Overlay Controls */}
                <div className="absolute top-6 right-6 z-10 flex flex-col gap-3">
                    <MapButton icon={Layers} active />
                    <MapButton icon={Maximize} />
                    <MapButton icon={Navigation} />
                    <MapButton icon={Filter} />
                </div>

                <div className="absolute bottom-8 left-8 z-10 flex flex-col gap-4 max-w-[350px]">
                    <div className="glass p-6 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-700">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                <Compass size={24} className="animate-spin-slow" />
                            </div>
                            <div>
                                <h4 className="text-white font-black text-lg">Radar Activo</h4>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Localización Actualizada</p>
                            </div>
                        </div>

                        {markers.length > 0 ? (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm py-2 border-b border-white/5">
                                    <span className="text-slate-500 font-medium">Marcadores:</span>
                                    <span className="text-white font-bold">{markers.length}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm py-2 border-b border-white/5">
                                    <span className="text-slate-500 font-medium">Última Lat:</span>
                                    <span className="text-indigo-400 font-bold">{markers[0].lat.toFixed(6)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm py-2">
                                    <span className="text-slate-500 font-medium">Última Lon:</span>
                                    <span className="text-indigo-400 font-bold">{markers[0].lng.toFixed(6)}</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 italic mt-4">Cargando puntos de interés...</p>
                        )}
                    </div>
                </div>
            </div>

            <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
        </div>
    );
}

function MapButton({ icon: Icon, active }: any) {
    return (
        <button className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-2xl backdrop-blur-md border ${active
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-600/20'
                : 'bg-slate-900/80 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-white'
            }`}>
            <Icon size={20} />
        </button>
    );
}

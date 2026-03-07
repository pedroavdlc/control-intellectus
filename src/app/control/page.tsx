'use client';

import { useState, useEffect } from 'react';
import DataTable from '@/components/DataTable';
import { Database, Download, RefreshCcw, Search, Filter } from 'lucide-react';

export default function SearchControlPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/intellectus/control-data');
            const result = await res.json();
            if (result.success) {
                setData(result.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredData = data.filter(item =>
        Object.values(item).some(val =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
    ).reverse(); // Most recent first

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Control de Búsquedas</h1>
                    <p className="text-slate-400 text-lg font-medium">Historial completo del archivo Excel Maestro</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar folio, número, agente..."
                            className="bg-slate-900/50 border border-white/5 rounded-2xl py-3 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-indigo-500/50 w-full md:w-80 transition-all font-sans"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white transition-all border border-white/5"
                    >
                        <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatItem label="Total Registros" value={data.length} color="text-indigo-400" />
                <StatItem label="Positivos (GEO)" value={data.filter(d => String(d['Resultado\r\n(POS / NEG)']).toLowerCase().includes('pos')).length} color="text-emerald-400" />
                <StatItem label="Negativos" value={data.filter(d => String(d['Resultado\r\n(POS / NEG)']).toLowerCase().includes('neg')).length} color="text-rose-400" />
            </div>

            <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl min-h-[500px]">
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center gap-4 opacity-50">
                        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                        <p className="text-white font-bold tracking-widest uppercase text-xs">Cargando base de datos maestra...</p>
                    </div>
                ) : (
                    <DataTable
                        data={filteredData}
                        columns={data.length > 0 ? Object.keys(data[0]) : []}
                    />
                )}
            </div>
        </div>
    );
}

function StatItem({ label, value, color }: any) {
    return (
        <div className="glass p-6 rounded-3xl border border-white/5 flex flex-col gap-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
            <span className={`text-3xl font-black ${color}`}>{value}</span>
        </div>
    );
}

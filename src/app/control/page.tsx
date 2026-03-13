'use client';

import { useState, useEffect } from 'react';
import DataTable from '@/components/DataTable';
import { Database, Download, RefreshCcw, Search, Filter } from 'lucide-react';

export default function SearchControlPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/intellectus/control-data');
            const result = await res.json();
            if (result.success) {
                setData(result.data);
            } else if (result.message) {
                setError(result.message);
                setData([]);
            }
        } catch (e) {
            console.error(e);
            setError('Error al conectar con la base de datos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const parseDataDate = (dStr: string) => {
        if (!dStr) return 0;
        const m = dStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})[\s,]+(\d{1,2}):(\d{2})/);
        if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00`).getTime();
        return new Date(dStr).getTime() || 0;
    };

    const filteredData = data.filter(item =>
        Object.values(item).some(val =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
    ).sort((a, b) => {
        const numA = parseInt(a['Núm. prog.']) || 0;
        const numB = parseInt(b['Núm. prog.']) || 0;
        if (numA !== numB) return numB - numA;
        return parseDataDate(b['Fecha consulta']) - parseDataDate(a['Fecha consulta']);
    });

    const handleDataChange = async (newData: any[]) => {
        setData(newData);
        await syncWithServer(newData);
    };

    const handleDelete = async (rowIdx: number) => {
        if (!confirm('¿Estás seguro de eliminar este registro del Excel? Esta acción no se puede deshacer.')) return;
        
        // Find the absolute index in the original data to delete correctly
        const itemToDelete = filteredData[rowIdx];
        const newData = data.filter(item => item !== itemToDelete);
        
        setData(newData);
        await syncWithServer(newData);
    };

    const syncWithServer = async (newData: any[]) => {
        try {
            const res = await fetch('/api/intellectus/control-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: newData })
            });
            const result = await res.json();
            if (!result.success) {
                alert('⚠️ No se pudo guardar en el Excel: ' + result.message);
                fetchData();
            }
        } catch (e) {
            console.error('Save error:', e);
            alert('Error de conexión al intentar guardar.');
            fetchData();
        }
    };

    // Calculate Top Agent
    const agentStats = data.reduce((acc: any, curr: any) => {
        const agent = curr['Realizó la consulta'] || 'DESCONOCIDO';
        acc[agent] = (acc[agent] || 0) + 1;
        return acc;
    }, {});

    const topAgent = Object.entries(agentStats).sort((a: any, b: any) => b[1] - a[1])[0] || ['-', 0];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Control de Excel</h1>
                    <p className="text-slate-400 text-lg font-medium">Historial completo del archivo Excel Maestro y PDFs Cargados</p>
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatItem label="Total Registros" value={data.length} color="text-white" />
                <StatItem label="Top Agente" value={topAgent[0]} subValue={`${topAgent[1]} solicitudes`} color="text-indigo-400" />
                <StatItem label="Positivos (GEO)" value={data.filter(d => String(d['Resultado\r\n(POS / NEG)']).includes('POSITIVO')).length} color="text-emerald-400" />
                <StatItem label="Pendientes" value={data.filter(d => String(d['Resultado\r\n(POS / NEG)']).includes('PENDIENTE')).length} color="text-orange-400" />
            </div>

            <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl min-h-[500px] relative">
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center gap-4 opacity-50">
                        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                        <p className="text-white font-bold tracking-widest uppercase text-xs">Cargando base de datos maestra...</p>
                    </div>
                ) : error ? (
                    <div className="p-20 flex flex-col items-center justify-center gap-6 text-center">
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-full">
                            <Database className="text-amber-500" size={32} />
                        </div>
                        <div className="max-w-md space-y-2">
                            <p className="text-white font-bold text-xl">{error}</p>
                            <p className="text-slate-400">El sistema no pudo acceder al archivo Excel porque está abierto en otra aplicación o no existe.</p>
                        </div>
                        <button 
                            onClick={fetchData}
                            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all border border-white/10"
                        >
                            Intentar de nuevo
                        </button>
                    </div>
                ) : (
                    <DataTable
                        data={filteredData}
                        columns={data.length > 0 ? Object.keys(data[0]) : []}
                        onDataChange={handleDataChange}
                        onDelete={handleDelete}
                    />
                )}
            </div>
        </div>
    );
}

function StatItem({ label, value, subValue, color }: any) {
    return (
        <div className="glass p-6 rounded-3xl border border-white/5 flex flex-col gap-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
            <span className={`text-xl font-black truncate ${color}`}>{value}</span>
            {subValue && <span className="text-[10px] text-slate-400 font-bold">{subValue}</span>}
        </div>
    );
}

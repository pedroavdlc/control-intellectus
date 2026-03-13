'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    Users, 
    CreditCard, 
    Clock, 
    AlertCircle, 
    CheckCircle2, 
    XCircle,
    BarChart3,
    Activity,
    ShieldAlert,
    Map as MapIcon
} from 'lucide-react';

export default function AuditoriaPage() {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchControlData() {
            try {
                const res = await fetch('/api/intellectus/control-data');
                const result = await res.json();
                if (result.success && result.data) {
                    setData(result.data);
                }
            } catch (e) {
                console.error("Error loading auditoria:", e);
            } finally {
                setIsLoading(false);
            }
        }
        fetchControlData();
    }, []);

    // Calcula estadísticas agrupadas por agente/solicitante
    const agentStats = useMemo(() => {
        if (!data.length) return [];
        const map = new Map();

        data.forEach(row => {
            const agent = String(row['Realizó la consulta'] || 'DESCONOCIDO').toUpperCase();
            if (!map.has(agent)) {
                map.set(agent, {
                    name: agent,
                    totalRequests: 0,
                    geos: 0,
                    sabanas: 0,
                    creditsUsed: 0,
                    positive: 0,
                    negative: 0,
                    pending: 0,
                    lastActive: null
                });
            }

            const stats = map.get(agent);
            stats.totalRequests += 1;
            
            // Tipo
            const isGeo = String(row['Tipo de consulta'] || '').toUpperCase() === 'GEO';
            if (isGeo) stats.geos += 1;
            else stats.sabanas += 1;

            // Créditos (Cálculo automático según la compañía si no viene en Excel - AT&T cobra 2)
            const company = String(row['Compañía'] || '').toUpperCase();
            const credits = (company.includes('AT&T') || company.includes('ATT')) ? 2 : 1;
            stats.creditsUsed += credits;

            // Resultado
            const res = String(row['Resultado\r\n(POS / NEG)'] || row['Resultado'] || '').toUpperCase();
            if (res.includes('POSITIVO') || res.includes('POS')) stats.positive += 1;
            else if (res.includes('NEGATIVO') || res.includes('NEG')) stats.negative += 1;
            else stats.pending += 1;

            // Última Actividad (aproximada por fecha de consulta)
            const dateStr = row['Fecha consulta'];
            if (dateStr && (!stats.lastActive || new Date(dateStr) > new Date(stats.lastActive))) {
                stats.lastActive = dateStr;
            }
        });

        return Array.from(map.values()).sort((a, b) => b.totalRequests - a.totalRequests);
    }, [data]);

    // Filtrar los que están pendientes globalmente
    const pendientesList = useMemo(() => {
        return data.filter(row => {
            const res = String(row['Resultado\r\n(POS / NEG)'] || row['Resultado'] || '').toUpperCase();
            return res.includes('PENDIENTE') || res.trim() === ''; // Incluir vacíos como pendientes
        }).reverse(); // Los más recientes primero
    }, [data]);

    if (isLoading) {
        return <div className="h-full w-full flex items-center justify-center bg-zinc-950 text-slate-500">Cargando datos de auditoría...</div>;
    }

    return (
        <div className="h-[calc(100vh-100px)] overflow-y-auto no-scrollbar flex flex-col gap-8 pb-10">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-black text-white tracking-tighter mb-2 flex items-center gap-4">
                    Auditoría Interna <BarChart3 className="text-blue-500" size={32} />
                </h1>
                <p className="text-slate-400 text-lg font-medium">Rendimiento, uso de créditos y control de operaciones.</p>
            </div>

            {/* Fila superior: Resumen y Panel de Pendientes Críticos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Global Stats */}
                <div className="glass p-6 rounded-3xl border border-white/5 flex flex-col gap-6">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Activity size={14}/> Visión Global</h3>
                    <div className="grid grid-cols-2 gap-4 flex-1">
                        <div className="bg-zinc-900/50 rounded-2xl p-4 border border-white/5">
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Total Créditos</p>
                            <p className="text-3xl font-black text-white">{agentStats.reduce((acc, a) => acc + a.creditsUsed, 0)}</p>
                        </div>
                        <div className="bg-zinc-900/50 rounded-2xl p-4 border border-white/5">
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Total Peticiones</p>
                            <p className="text-3xl font-black text-white">{data.length}</p>
                        </div>
                        <div className="bg-indigo-900/20 rounded-2xl p-4 border border-indigo-500/20 col-span-2 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-1">Agente Top (GEOS)</p>
                                <p className="text-xl font-black text-indigo-100">{agentStats[0]?.name || 'N/A'}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                <Users size={20} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 glass p-6 rounded-3xl border border-rose-500/20 bg-rose-950/10 flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-6 shrink-0">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-rose-500 flex items-center gap-2">
                            <ShieldAlert size={16} /> Atención Requerida ({pendientesList.length})
                        </h3>
                        <span className="px-3 py-1 bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase rounded-full border border-rose-500/30">
                            Trabajos Pendientes
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-2">
                        {pendientesList.length > 0 ? pendientesList.map((row, i) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-zinc-900/60 border border-white/5 hover:bg-zinc-800 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                                    <div className="flex flex-col">
                                        <p className="text-sm font-black text-white mb-0.5 max-w-[200px] truncate" title={row['Teléfono'] || row['folio']}>
                                            {row['Teléfono']} {row['folio'] && `(${row['folio']})`}
                                        </p>
                                        <p className="text-[10px] font-mono text-zinc-400 tracking-widest uppercase">
                                            {row['Fecha consulta'] || 'Sin Fecha'} • {String(row['Compañía'] || 'Desconocida').slice(0, 15)}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 sm:mt-0 flex flex-col sm:items-end gap-1 shrink-0">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                                        {row['Tipo de consulta'] || 'No Definido'}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 uppercase font-black truncate max-w-[150px]" title={row['Realizó la consulta']}>
                                       Agente: {row['Realizó la consulta'] || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2 opacity-50">
                                <CheckCircle2 size={32} />
                                <p className="text-xs uppercase font-bold tracking-widest">Sistema Limpio. Nada Pendiente.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Rendimiento por Agente */}
            <div>
                <h3 className="text-xl font-black text-white tracking-widest uppercase mb-6 flex items-center gap-3">
                    <Users className="text-zinc-500" /> Rendimiento de Agentes
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {agentStats.map((agent, i) => (
                        <div key={i} className="glass rounded-3xl border border-white/5 p-6 flex flex-col relative overflow-hidden group hover:border-white/10 transition-colors">
                            {/* Ranking Decorator */}
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/10 rotate-12 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                <span className="text-2xl font-black text-blue-500/30 -ml-2 mt-2">#{i+1}</span>
                            </div>

                            <h4 className="text-lg font-black text-white truncate max-w-[85%] mb-1">{agent.name}</h4>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1 mb-6">
                                <Clock size={10} /> Última: {agent.lastActive || 'Desconocido'}
                            </p>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                                    <CreditCard size={16} className="text-amber-500" />
                                    <div>
                                        <p className="text-xs font-black text-white leading-none">{agent.creditsUsed}</p>
                                        <p className="text-[9px] text-zinc-500 uppercase font-bold mt-1">Créditos</p>
                                    </div>
                                </div>
                                <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                                    <MapIcon size={16} className="text-blue-500" />
                                    <div>
                                        <p className="text-xs font-black text-white leading-none">{agent.geos} <span className="text-zinc-600 font-medium">/</span> {agent.sabanas}</p>
                                        <p className="text-[9px] text-zinc-500 uppercase font-bold mt-1">Geos / Sabanas</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-white/5">
                                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-3">Efectividad de Búsqueda</p>
                                <div className="flex justify-between items-center text-xs font-bold">
                                    <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12}/> {agent.positive}</span>
                                    <span className="text-rose-400 flex items-center gap-1"><XCircle size={12}/> {agent.negative}</span>
                                    <span className="text-amber-400 flex items-center gap-1"><AlertCircle size={12}/> {agent.pending}</span>
                                </div>
                                {/* Progress bar efectividad */}
                                <div className="flex w-full h-1.5 rounded-full overflow-hidden mt-2 bg-zinc-800">
                                    <div style={{width: `${(agent.positive / agent.totalRequests) * 100}%`}} className="bg-emerald-500" />
                                    <div style={{width: `${(agent.negative / agent.totalRequests) * 100}%`}} className="bg-rose-500" />
                                    <div style={{width: `${(agent.pending / agent.totalRequests) * 100}%`}} className="bg-amber-500" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
        </div>
    );
}

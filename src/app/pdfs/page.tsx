'use client';

import { useState, useEffect } from 'react';
import { FileText, Search, Download, Trash2, Calendar, User, Filter, MoreVertical, ExternalLink, ArrowLeft, Clock } from 'lucide-react';

interface PDFRecord {
    id: string;
    name: string;
    phone: string;
    date: string;
    size: string;
    address: string;
    fileId?: string;
}

export default function PDFsPage() {
    const [pdfs, setPdfs] = useState<PDFRecord[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState('');
    const [timeFilter, setTimeFilter] = useState('');

    const [isLoading, setIsLoading] = useState(true);

    const handleOpenPDF = (fileId?: string) => {
        if (fileId) {
            window.open(`/api/files/${fileId}`, '_blank');
        } else {
            alert('Este reporte no tiene un archivo físico asociado en la base de datos.');
        }
    };

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch('/api/intellectus/history');
                const data = await res.json();
                
                if (data.success && data.history) {
                    const records: PDFRecord[] = [];
                    Object.keys(data.history).forEach(phone => {
                        data.history[phone].forEach((p: any) => {
                            records.push({
                                id: p.id,
                                name: p.fileId ? `${p.fileId}.pdf` : `Informe_${phone}_${p.id.slice(0, 4)}.pdf`,
                                phone: phone,
                                date: p.date,
                                size: '122 KB',
                                address: p.address,
                                fileId: p.fileId
                            });
                        });
                    });

                    
                    setPdfs(records);
                }
            } catch (err) {
                console.error("Failed to load history from DB", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const groupedByPhone = pdfs.reduce((acc, curr) => {
        if (!acc[curr.phone]) acc[curr.phone] = [];
        acc[curr.phone].push(curr);
        return acc;
    }, {} as Record<string, PDFRecord[]>);

    // If searching globally
    const filteredGlobal = Object.entries(groupedByPhone)
        .map(([phone, records]) => ({ phone, records }))
        .filter(group => group.phone.includes(searchTerm) || group.records.some(r => r.address.toLowerCase().includes(searchTerm.toLowerCase())));

    // If viewing a specific phone
    const phoneRecords = selectedPhone && groupedByPhone[selectedPhone] 
        ? groupedByPhone[selectedPhone].filter(r => 
            (dateFilter === '' || r.date.includes(dateFilter)) &&
            (timeFilter === '' || r.date.includes(timeFilter))
        ) 
        : [];

    return (
        <div className="h-full flex flex-col space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        {selectedPhone ? (
                            <button onClick={() => { setSelectedPhone(null); setDateFilter(''); setTimeFilter(''); }} className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center border border-white/10 transition-all active:scale-90">
                                <ArrowLeft size={20} />
                            </button>
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                                <FileText size={20} />
                            </div>
                        )}
                        <h1 className="text-4xl font-black text-white tracking-tighter">
                            {selectedPhone ? `Expediente: ${selectedPhone}` : 'Fichas Tácticas'}
                        </h1>
                    </div>
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-widest pl-14">
                        {selectedPhone ? `Total de registros: ${phoneRecords.length}` : 'Repositorio Global de Informes y Archivos'}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex gap-2 w-full md:w-auto">
                        {selectedPhone ? (
                            <>
                                <div className="relative group w-full md:w-48">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Fecha (DD/MM/AAAA)"
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:bg-slate-900 transition-all placeholder:text-slate-600"
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                    />
                                </div>
                                <div className="relative group w-full md:w-40">
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Hora (HH:MM)"
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:bg-slate-900 transition-all placeholder:text-slate-600"
                                        value={timeFilter}
                                        onChange={(e) => setTimeFilter(e.target.value)}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="relative group w-full md:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar por teléfono objetivo..."
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:bg-slate-900 transition-all placeholder:text-slate-600"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* List/Table View */}
            <div className="flex-1 glass rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative">
                {!selectedPhone ? (
                    // AGRUPADO POR NUMERO (VISTA GLOBAL PRINCIPAL)
                    filteredGlobal.length > 0 ? (
                        <div className="w-full overflow-x-auto custom-scrollbar h-[calc(100vh-250px)] p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredGlobal.map((group, idx) => (
                                    <div 
                                        key={group.phone}
                                        onClick={() => setSelectedPhone(group.phone)}
                                        className="bg-slate-900/40 border border-white/5 hover:border-indigo-500/40 rounded-[2rem] p-6 hover:bg-slate-900/80 transition-all duration-300 cursor-pointer group/card flex flex-col"
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20 group-hover/card:scale-110 transition-transform">
                                                <User size={24} />
                                            </div>
                                            <div className="bg-slate-800 text-slate-300 text-xs font-black px-3 py-1.5 rounded-xl border border-white/10">
                                                {group.records.length} {group.records.length === 1 ? 'REGISTRO' : 'REGISTROS'}
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-black text-white tracking-widest mb-2">{group.phone}</h3>
                                        <div className="mt-auto pt-4 border-t border-white/5 flex gap-2">
                                            <div className="flex flex-1 items-center justify-center gap-1.5 text-indigo-300 bg-indigo-500/10 px-2 py-1.5 rounded-lg border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest">
                                                <Calendar size={12} />
                                                <span>{group.records[0]?.date.split(' ')[0] || group.records[0]?.date.split('T')[0] || 'N/A'}</span>
                                            </div>
                                            <div className="flex flex-1 items-center justify-center gap-1.5 text-slate-400 bg-slate-800/80 px-2 py-1.5 rounded-lg border border-white/5 text-[10px] font-black tracking-widest">
                                                <Clock size={12} />
                                                <span>{group.records[0]?.date.split(' ')[1] || group.records[0]?.date.split('T')[1]?.split('.')[0] || '--:--'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 grayscale">
                            <div className="p-6 rounded-full bg-slate-900 border border-white/5 mb-6 shadow-2xl">
                                <Search size={64} className="text-slate-600" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-widest">No hay resultados</h3>
                            <p className="text-slate-400 mt-2 font-medium">No se encontraron números que coincidan con la búsqueda.</p>
                        </div>
                    )
                ) : (
                    // VISTA DETALLE POR NUMERO (TABLA)
                    phoneRecords.length > 0 ? (
                        <div className="w-full overflow-x-auto custom-scrollbar h-[calc(100vh-250px)]">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead className="bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 border-b border-white/5">
                                    <tr>
                                        <th className="py-4 px-6 text-[10px] font-black tracking-widest text-slate-500 uppercase">Documento / Archivo</th>
                                        <th className="py-4 px-6 text-[10px] font-black tracking-widest text-slate-500 uppercase">Área / Dirección Relacionada</th>
                                        <th className="py-4 px-6 text-[10px] font-black tracking-widest text-slate-500 uppercase">Fecha Reg.</th>
                                        <th className="py-4 px-6 text-[10px] font-black tracking-widest text-slate-500 uppercase text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {phoneRecords.map((pdf, idx) => (
                                        <tr 
                                            key={pdf.id} 
                                            className="hover:bg-white/[0.02] transition-colors group cursor-default"
                                        >
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform border border-rose-500/20">
                                                        <FileText size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
                                                            {pdf.name}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                                                            ID: {pdf.id.substring(0, 8)} • {pdf.size}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="text-xs font-medium text-slate-400 line-clamp-2 max-w-[300px] italic">
                                                    "{pdf.address}"
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col gap-1.5 min-w-[120px]">
                                                    <div className="flex items-center gap-2 text-indigo-300 bg-indigo-500/10 px-2.5 py-1.5 rounded-lg border border-indigo-500/20 shadow-sm w-max">
                                                        <Calendar size={12} />
                                                        <span className="text-[10px] font-black tracking-widest uppercase">{pdf.date.split(' ')[0] || pdf.date.split('T')[0] || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-slate-400 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-white/5 shadow-sm w-max">
                                                        <Clock size={12} />
                                                        <span className="text-[10px] font-black tracking-widest uppercase">{pdf.date.split(' ')[1] || pdf.date.split('T')[1]?.split('.')[0] || '--:--'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleOpenPDF(pdf.fileId)} className="p-2 rounded-lg hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all border border-transparent hover:border-indigo-500/30 tooltip-trigger" title="Descargar PDF">
                                                        <Download size={16} />
                                                    </button>
                                                    <button onClick={() => handleOpenPDF(pdf.fileId)} className="p-2 rounded-lg hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-all border border-transparent hover:border-emerald-500/30 tooltip-trigger" title="Ver Detalles">
                                                        <ExternalLink size={16} />
                                                    </button>
                                                    <button className="p-2 rounded-lg hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all border border-transparent hover:border-rose-500/30 tooltip-trigger" title="Eliminar Archivo">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 grayscale">
                            <div className="p-6 rounded-full bg-slate-900 border border-white/5 mb-6 shadow-2xl">
                                <Clock size={64} className="text-slate-600" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-widest">Sin Coincidencias</h3>
                            <p className="text-slate-400 mt-2 font-medium">No se encontraron registros en esa fecha u horario para este número.</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

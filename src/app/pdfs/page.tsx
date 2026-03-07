'use client';

import { useState, useEffect } from 'react';
import { FileText, Search, Download, Trash2, Calendar, User, Filter, MoreVertical, ExternalLink } from 'lucide-react';

interface PDFRecord {
    id: string;
    name: string;
    phone: string;
    date: string;
    size: string;
    address: string;
}

export default function PDFsPage() {
    const [pdfs, setPdfs] = useState<PDFRecord[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Load from history for now
        const saved = localStorage.getItem('intellectus_history');
        if (saved) {
            const history = JSON.parse(saved);
            const records: PDFRecord[] = [];
            Object.keys(history).forEach(phone => {
                history[phone].forEach((p: any) => {
                    records.push({
                        id: p.id,
                        name: `Informe_${phone}_${p.id.slice(-4)}.pdf`,
                        phone: phone,
                        date: p.date,
                        size: '122 KB',
                        address: p.address
                    });
                });
            });
            setPdfs(records);
        }
    }, []);

    const filtered = pdfs.filter(p =>
        p.phone.includes(searchTerm) ||
        p.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-10">
            <div className="flex items-center justify-between">
                <div className="animate-in fade-in slide-in-from-left-4 duration-700">
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Bóveda de Documentos</h1>
                    <p className="text-slate-400 text-lg font-medium">Gestión y repositorio de informes extraídos</p>
                </div>

                <div className="flex gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por número o dirección..."
                            className="bg-slate-900/50 border border-white/5 rounded-2xl py-3 pl-12 pr-6 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50 w-[350px] transition-all backdrop-blur-md"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all border border-white/5">
                        <Filter size={18} />
                        <span>Filtros</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((pdf, idx) => (
                    <div
                        key={pdf.id}
                        className="glass p-6 rounded-[2rem] border border-white/5 hover:border-indigo-500/30 transition-all duration-500 group animate-in fade-in zoom-in"
                        style={{ animationDelay: `${idx * 50}ms` }}
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-inner">
                                <FileText size={28} />
                            </div>
                            <button className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
                                <MoreVertical size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-bold text-white truncate mb-1">{pdf.name}</h3>
                                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
                                    <User size={12} className="text-indigo-500" />
                                    <span>{pdf.phone}</span>
                                    <span className="mx-1">•</span>
                                    <span>{pdf.size}</span>
                                </div>
                            </div>

                            <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                                <p className="text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed italic">
                                    "{pdf.address}"
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Calendar size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{pdf.date}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white transition-all shadow-lg active:scale-90">
                                        <Download size={16} />
                                    </button>
                                    <button className="p-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-400 hover:text-white transition-all shadow-lg active:scale-90">
                                        <ExternalLink size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-30 grayscale">
                        <FileText size={80} className="text-slate-700 mb-6" />
                        <h3 className="text-2xl font-black text-white">No se encontraron documentos</h3>
                        <p className="text-slate-500 mt-2 font-medium">Sube archivos PDF en el Panel Principal para verlos aquí</p>
                    </div>
                )}
            </div>
        </div>
    );
}

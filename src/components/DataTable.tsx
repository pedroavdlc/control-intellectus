'use client';

import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Edit2, Download, Trash2, Filter } from 'lucide-react';

interface DataTableProps {
    columns: string[];
    data: any[];
}

export default function DataTable({ columns, data }: DataTableProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const filteredData = data.filter(row =>
        Object.values(row).some(val =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="w-full glass rounded-3xl overflow-hidden border border-slate-700/50 shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-700/50 flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-white tracking-tight">Registro de Datos</h2>
                <div className="flex gap-4 items-center">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-indigo-400 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar registros..."
                            className="bg-slate-900/50 border border-slate-700 rounded-full py-2 pl-10 pr-6 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50 w-[250px] transition-all duration-300"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="p-2 rounded-full border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
                        <Filter size={18} />
                    </button>
                    <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 shadow-lg shadow-indigo-600/20 active:scale-95">
                        <Download size={16} />
                        <span>Exportar</span>
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-900/50 text-slate-500 text-xs font-bold uppercase tracking-widest border-b border-slate-800">
                            {columns.map(col => (
                                <th key={col} className="px-6 py-4">{col}</th>
                            ))}
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {currentData.length > 0 ? currentData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-indigo-500/5 text-slate-300 transition-colors duration-200 group">
                                {columns.map(col => (
                                    <td key={col} className="px-6 py-4 text-sm">{row[col]}</td>
                                ))}
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <button className="p-2 rounded-lg hover:bg-indigo-600/20 text-indigo-400 hover:text-white transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button className="p-2 rounded-lg hover:bg-rose-600/20 text-rose-500 hover:text-white transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={columns.length + 1} className="py-20 text-center text-slate-500">
                                    <div className="flex flex-col items-center gap-4">
                                        <Search size={48} className="text-slate-700" />
                                        <p className="text-lg">No se encontraron resultados para tu búsqueda</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-4 bg-slate-900/40 border-t border-slate-800 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                    Mostrando <span className="text-slate-300 font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="text-slate-300 font-medium">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> de <span className="text-slate-300 font-medium">{filteredData.length}</span> resultados
                </p>
                <div className="flex items-center gap-2">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="p-2 rounded-lg border border-slate-700 disabled:opacity-30 disabled:hover:bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white transition-all active:scale-90"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div className="flex items-center gap-1 mx-2">
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all duration-300 ${currentPage === i + 1
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                        : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                                    }`}
                                onClick={() => setCurrentPage(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="p-2 rounded-lg border border-slate-700 disabled:opacity-30 disabled:hover:bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white transition-all active:scale-90"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}

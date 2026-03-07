'use client';

import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Edit2, Download, Trash2, Filter, Save, X } from 'lucide-react';
import * as xlsx from 'xlsx';

interface DataTableProps {
    columns: string[];
    data: any[];
    onDataChange?: (newData: any[]) => void;
}

export default function DataTable({ columns, data, onDataChange }: DataTableProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [localData, setLocalData] = useState<any[]>(data);
    const [editingCell, setEditingCell] = useState<{ row: number, col: string } | null>(null);
    const [editValue, setEditValue] = useState('');

    const itemsPerPage = 8;

    useEffect(() => {
        setLocalData(data);
    }, [data]);

    const filteredData = localData.filter(row =>
        Object.values(row).some(val =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleEdit = (rowIdx: number, col: string, value: any) => {
        setEditingCell({ row: rowIdx, col });
        setEditValue(String(value));
    };

    const saveEdit = () => {
        if (!editingCell) return;
        const newData = [...localData];
        newData[editingCell.row][editingCell.col] = editValue;
        setLocalData(newData);
        setEditingCell(null);
        if (onDataChange) onDataChange(newData);
    };

    const exportExcel = () => {
        const ws = xlsx.utils.json_to_sheet(localData);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Datos_Modificados");
        xlsx.writeFile(wb, "informe_modificado.xlsx");
    };

    return (
        <div className="w-full glass rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl flex flex-col animate-in fade-in zoom-in duration-700">
            <div className="p-8 border-b border-white/5 flex items-center justify-between gap-4 bg-slate-900/20">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Análisis de Datos Excel</h2>
                    <p className="text-slate-500 text-sm mt-1">Puedes modificar los valores haciendo clic en las celdas</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Filtrar registros..."
                            className="bg-slate-950/50 border border-slate-800 rounded-2xl py-3 pl-12 pr-6 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50 w-[300px] transition-all duration-300 backdrop-blur-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={exportExcel}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-300 shadow-xl shadow-indigo-600/20 active:scale-95 group overflow-hidden relative"
                    >
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <Download size={18} className="relative z-10" />
                        <span className="relative z-10">Exportar Cambios</span>
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-950/30 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                            {columns.map(col => (
                                <th key={col} className="px-8 py-5">{col}</th>
                            ))}
                            <th className="px-8 py-5 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {currentData.length > 0 ? currentData.map((row, idx) => {
                            const actualRowIdx = (currentPage - 1) * itemsPerPage + idx;
                            return (
                                <tr key={idx} className="hover:bg-white/[0.02] text-slate-300 transition-colors duration-200 group">
                                    {columns.map(col => (
                                        <td
                                            key={col}
                                            className="px-8 py-5 text-sm font-medium border-r border-white/5 last:border-0"
                                            onClick={() => handleEdit(actualRowIdx, col, row[col])}
                                        >
                                            {editingCell?.row === actualRowIdx && editingCell?.col === col ? (
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        autoFocus
                                                        className="bg-slate-800 border-indigo-500 border rounded px-2 py-1 text-white w-full outline-none shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') saveEdit();
                                                            if (e.key === 'Escape') setEditingCell(null);
                                                        }}
                                                    />
                                                    <button onClick={saveEdit} className="text-emerald-500 hover:text-emerald-400 p-1"><Save size={16} /></button>
                                                    <button onClick={() => setEditingCell(null)} className="text-rose-500 hover:text-rose-400 p-1"><X size={16} /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between cursor-pointer group/cell">
                                                    <span>{row[col]}</span>
                                                    <Edit2 size={12} className="text-slate-700 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                                                </div>
                                            )}
                                        </td>
                                    ))}
                                    <td className="px-8 py-5 text-right">
                                        <button className="p-2.5 rounded-xl hover:bg-rose-500/10 text-rose-500/30 hover:text-rose-500 transition-all">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={columns.length + 1} className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-6 opacity-20 grayscale">
                                        <Search size={64} className="text-slate-500" />
                                        <div className="space-y-1">
                                            <p className="text-2xl font-black text-white">Sin Coincidencias</p>
                                            <p className="text-sm font-medium">Prueba con términos de búsqueda diferentes</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-6 bg-slate-950/20 border-t border-white/5 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 tracking-wider">
                    VISTA <span className="text-indigo-400">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)}</span> DE <span className="text-white">{filteredData.length}</span> ENTRADAS
                </p>
                <div className="flex items-center gap-3">
                    <PageButton
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        icon={ChevronLeft}
                    />
                    <div className="flex items-center gap-1.5 mx-2">
                        {[...Array(Math.min(5, totalPages))].map((_, i) => (
                            <button
                                key={i}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-300 ${currentPage === i + 1
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/50'
                                        : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300 border border-transparent'
                                    }`}
                                onClick={() => setCurrentPage(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                    <PageButton
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                        icon={ChevronRight}
                    />
                </div>
            </div>
        </div>
    );
}

function PageButton({ disabled, onClick, icon: Icon }: any) {
    return (
        <button
            disabled={disabled}
            onClick={onClick}
            className={`p-2.5 rounded-xl border border-white/5 backdrop-blur-md transition-all active:scale-90 ${disabled
                    ? 'opacity-20 cursor-not-allowed'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-white hover:border-indigo-500/30 shadow-lg'
                }`}
        >
            <Icon size={18} />
        </button>
    );
}

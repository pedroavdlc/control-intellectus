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
        <div className="w-full glass rounded-xl overflow-hidden border border-white/10 shadow-xl flex flex-col animate-in fade-in zoom-in duration-500">
            <div className="p-5 border-b border-white/5 flex items-center justify-between gap-4 bg-zinc-900/30">
                <div>
                    <h2 className="text-lg font-bold text-zinc-100 tracking-wider uppercase">Análisis de Datos</h2>
                    <p className="text-zinc-500 text-xs mt-0.5">Modificación directa de celdas habilitada</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Filtrar registros..."
                            className="bg-zinc-950/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-xs text-zinc-300 focus:outline-none focus:border-blue-500/50 w-[250px] transition-all duration-300"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={exportExcel}
                        className="flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600 hover:text-white text-blue-400 px-4 py-2 rounded-lg font-bold text-xs transition-all duration-300 shadow-md group"
                    >
                        <Download size={14} />
                        <span>Exportar JSON</span>
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-950/50 text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-white/5">
                            {columns.map(col => (
                                <th key={col} className="px-6 py-3 whitespace-nowrap">{col}</th>
                            ))}
                            <th className="px-6 py-3 text-right">Ac</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {currentData.length > 0 ? currentData.map((row, idx) => {
                            const actualRowIdx = (currentPage - 1) * itemsPerPage + idx;
                            return (
                                <tr key={idx} className="hover:bg-white/[0.02] text-zinc-300 transition-colors duration-200 group">
                                    {columns.map(col => (
                                        <td
                                            key={col}
                                            className="px-6 py-3 text-xs font-mono border-r border-white/5 last:border-0 truncate max-w-[200px]"
                                            onClick={() => handleEdit(actualRowIdx, col, row[col])}
                                        >
                                            {editingCell?.row === actualRowIdx && editingCell?.col === col ? (
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        autoFocus
                                                        className="bg-zinc-900 border border-blue-500 border-b rounded px-2 py-1 text-white w-full outline-none text-xs"
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') saveEdit();
                                                            if (e.key === 'Escape') setEditingCell(null);
                                                        }}
                                                    />
                                                    <button onClick={saveEdit} className="text-emerald-500 hover:text-emerald-400 p-1"><Save size={14} /></button>
                                                    <button onClick={() => setEditingCell(null)} className="text-red-500 hover:text-red-400 p-1"><X size={14} /></button>
                                                </div>
                                            ) : (
                                                col === 'Ubicación Archivo' || col === 'Ruta de Archivo' ? (
                                                    row[col] && row[col].trim() !== '' ? (
                                                        <a 
                                                            href={`/api/files/direct?path=${encodeURIComponent(row[col])}`} 
                                                            target="_blank" 
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="flex items-center gap-1.5 w-max px-2.5 py-1 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded border border-blue-500/30 text-[10px] uppercase font-bold tracking-widest transition-colors duration-200"
                                                        >
                                                            Ver Archivo
                                                        </a>
                                                    ) : (
                                                        <span className="text-zinc-600 italic font-medium text-[10px]">Sin archivo</span>
                                                    )
                                                ) : (
                                                    <div className="flex items-center justify-between cursor-pointer group/cell gap-2">
                                                        <span className="truncate">{row[col]}</span>
                                                        <Edit2 size={10} className="text-zinc-600 opacity-0 group-hover/cell:opacity-100 transition-opacity flex-shrink-0" />
                                                    </div>
                                                )
                                            )}
                                        </td>
                                    ))}
                                    <td className="px-4 py-2 text-right">
                                        <button className="p-2 rounded-lg hover:bg-red-500/10 text-red-500/30 hover:text-red-500 transition-all">
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={columns.length + 1} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-30 grayscale">
                                        <Search size={48} className="text-zinc-500" />
                                        <div className="space-y-1">
                                            <p className="text-lg font-bold text-white uppercase tracking-widest">Dato no localizado</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-3 bg-zinc-950/50 border-t border-white/5 flex items-center justify-between">
                <p className="text-[10px] font-mono text-zinc-500 tracking-wider">
                    MOSTRANDO <span className="text-blue-400">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)}</span> / <span className="text-white">{filteredData.length}</span> ROWS
                </p>
                <div className="flex items-center gap-1.5">
                    <PageButton disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} icon={ChevronLeft} />
                    <div className="flex items-center gap-1 mx-2">
                        {[...Array(Math.min(5, totalPages))].map((_, i) => (
                            <button
                                key={i}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono transition-all duration-300 ${currentPage === i + 1
                                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                        : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 border border-transparent'
                                    }`}
                                onClick={() => setCurrentPage(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                    <PageButton disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} icon={ChevronRight} />
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
            className={`p-1.5 rounded-lg border border-white/5 transition-all ${disabled
                    ? 'opacity-20 cursor-not-allowed'
                    : 'hover:bg-zinc-800 text-zinc-400 hover:text-white hover:border-blue-500/30'
                }`}
        >
            <Icon size={14} />
        </button>
    );
}

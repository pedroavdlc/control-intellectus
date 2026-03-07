'use client';

import { useState } from 'react';
import DataTable from '@/components/DataTable';
import FileUpload from '@/components/Upload';
import { FileSpreadsheet, Download, Save, TrendingUp, AlertCircle, Database } from 'lucide-react';

export default function ExcelPage() {
    const [excelData, setExcelData] = useState<any[]>([]);
    const [excelCols, setExcelCols] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFile = async (file: File) => {
        setIsProcessing(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/process/excel', {
                method: 'POST',
                body: formData,
            });
            const result = await res.json();
            if (result.success) {
                setExcelData(result.data);
                setExcelCols(result.columns);
            } else {
                alert("Error: " + result.error);
            }
        } catch (e) {
            alert("Error al procesar el archivo");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-10">
            <div className="flex items-center justify-between">
                <div className="animate-in fade-in slide-in-from-left-4 duration-700">
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Control de Datos Excel</h1>
                    <p className="text-slate-400 text-lg font-medium">Edición, filtrado y exportación de bases de datos</p>
                </div>

                <div className="flex gap-4">
                    <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all border border-white/5">
                        <Database size={18} />
                        <span>Ver Base Local</span>
                    </button>
                </div>
            </div>

            {!excelData.length ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center py-10">
                    <div className="space-y-8 animate-in slide-in-from-left-8 duration-1000">
                        <div className="glass p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-emerald-500/10 blur-[100px] pointer-events-none" />
                            <div className="relative z-10 flex flex-col gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner">
                                    <FileSpreadsheet size={32} />
                                </div>
                                <h2 className="text-3xl font-black text-white tracking-tight">Sube tu archivo para comenzar</h2>
                                <p className="text-slate-400 text-lg leading-relaxed">
                                    Extraemos automáticamente todas las columnas y filas para que puedas editarlas, filtrarlas y exportarlas con un solo clic.
                                </p>
                                <div className="space-y-4">
                                    <FeatureItem text="Edición de celdas en tiempo real" />
                                    <FeatureItem text="Exportación compatible con Microsoft Excel" />
                                    <FeatureItem text="Búsqueda global inteligente" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="animate-in slide-in-from-right-8 duration-1000">
                        <FileUpload onFileSelect={handleFile} isLoading={isProcessing} />
                    </div>
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in duration-700">
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-3xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">Modo de Edición Activo</p>
                                <p className="text-slate-500 text-xs">Los cambios que realices son temporales hasta que los exportes.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setExcelData([])}
                            className="text-xs font-black uppercase text-slate-500 hover:text-white transition-colors tracking-[0.2em]"
                        >
                            Cerrar Informe
                        </button>
                    </div>
                    <DataTable columns={excelCols} data={excelData} onDataChange={(newData) => setExcelData(newData)} />
                </div>
            )}
        </div>
    );
}

function FeatureItem({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                <Save size={12} />
            </div>
            <span className="text-slate-300 font-medium text-sm">{text}</span>
        </div>
    );
}

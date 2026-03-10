'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, FileText, FileSpreadsheet, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';

interface UploadProps {
    onFileSelect: (file: File) => void;
    isLoading?: boolean;
    type?: 'pdf' | 'excel' | 'any';
}

export default function FileUpload({ onFileSelect, isLoading = false, type = 'any' }: UploadProps) {
    const [file, setFile] = useState<File | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const selectedFile = acceptedFiles[0];
            setFile(selectedFile);
            onFileSelect(selectedFile);
        }
    }, [onFileSelect]);

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
        },
        multiple: false,
        disabled: isLoading
    });

    const clearFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFile(null);
    };

    const isPDF = file?.type === 'application/pdf';
    const isExcel = file?.type.includes('spreadsheet') || file?.type.includes('ms-excel');

    return (
        <div className="w-full mt-auto">
            <div
                {...getRootProps()}
                className={`relative group cursor-pointer border-2 border-dashed rounded-3xl p-6 transition-all duration-500 flex flex-col items-center justify-center gap-3 ${isDragActive
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : isDragReject
                        ? 'border-rose-500 bg-rose-500/10'
                        : 'border-white/5 bg-slate-900/40 hover:border-indigo-500/30 hover:bg-slate-800/60 shadow-xl'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <input {...getInputProps()} />

                {isLoading ? (
                    <div className="flex flex-col items-center gap-3 py-2">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                        <p className="text-white font-black uppercase tracking-[0.2em] text-[9px] animate-pulse">Procesando...</p>
                    </div>
                ) : file ? (
                    <div className="flex flex-col items-center gap-3 animate-in zoom-in duration-500 py-1 w-full">
                        <div className={`p-4 rounded-2xl shadow-lg border border-white/5 ${isPDF ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {isPDF ? <FileText size={32} /> : <FileSpreadsheet size={32} />}
                        </div>
                        <div className="text-center w-full px-2">
                            <p className="text-white font-black text-xs truncate w-full tracking-tight uppercase mb-0.5">{file.name}</p>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Listo para análisis</span>
                        </div>
                        <button
                            onClick={clearFile}
                            className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500 text-white transition-all border border-white/5 shadow-xl"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center text-slate-500 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 transition-all duration-700 shadow-xl border border-white/5">
                            <UploadIcon size={20} className="group-hover:translate-y-[-2px] transition-transform duration-500" />
                        </div>
                        <div className="text-center px-2">
                            <h3 className="text-sm font-black text-white mb-1 tracking-wider uppercase">
                                {isDragActive ? 'Suelta el archivo' : 'Carga de Consulta'}
                            </h3>
                            <p className="text-slate-400 max-w-[200px] mx-auto text-[10px] font-bold uppercase tracking-widest leading-tight opacity-70">
                                Arrastre su <span className="text-indigo-400">PDF</span> o <span className="text-emerald-400">Excel</span> para escanear.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

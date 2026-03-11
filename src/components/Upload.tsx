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
                className={`relative group cursor-pointer border border-dashed rounded-xl p-5 transition-all duration-300 flex flex-col items-center justify-center gap-3 ${isDragActive
                    ? 'border-blue-500 bg-blue-500/5'
                    : isDragReject
                        ? 'border-red-500 bg-red-500/5'
                        : 'border-white/10 bg-zinc-900/50 hover:border-blue-500/30 hover:bg-zinc-800/80 shadow-md'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <input {...getInputProps()} />

                {isLoading ? (
                    <div className="flex flex-col items-center gap-3 py-2">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <p className="text-zinc-300 font-bold uppercase tracking-widest text-[9px] animate-pulse">Procesando</p>
                    </div>
                ) : file ? (
                    <div className="flex flex-col items-center gap-2 py-1 w-full">
                        <div className={`p-3 rounded-lg border border-white/10 ${isPDF ? 'bg-orange-500/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {isPDF ? <FileText size={24} /> : <FileSpreadsheet size={24} />}
                        </div>
                        <div className="text-center w-full px-2">
                            <p className="text-zinc-100 font-bold text-xs truncate w-full tracking-tight mb-0.5">{file.name}</p>
                            <span className="text-[10px] font-medium text-zinc-500">Listo para análisis</span>
                        </div>
                        <button
                            onClick={clearFile}
                            className="absolute top-2 right-2 p-1.5 rounded-md bg-zinc-800 hover:bg-red-500/80 text-zinc-300 hover:text-white transition-all border border-white/5 shadow-sm"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="w-10 h-10 rounded-lg bg-zinc-800/50 flex items-center justify-center text-zinc-500 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors border border-white/5">
                            <UploadIcon size={18} />
                        </div>
                        <div className="text-center px-2">
                            <h3 className="text-xs font-bold text-zinc-100 tracking-wide mb-1">
                                {isDragActive ? 'Suelta el archivo aquí' : 'Carga de Datos'}
                            </h3>
                            <p className="text-zinc-500 text-[10px] uppercase tracking-wider">
                                Arrastra <span className="text-blue-400">PDF</span> o <span className="text-emerald-400">Excel</span>
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

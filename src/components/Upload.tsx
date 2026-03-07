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
    });

    const clearFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFile(null);
    };

    const isPDF = file?.type === 'application/pdf';
    const isExcel = file?.type.includes('spreadsheet') || file?.type.includes('ms-excel');

    return (
        <div className="w-full">
            <div
                {...getRootProps()}
                className={`relative group cursor-pointer border-2 border-dashed rounded-3xl p-10 transition-all duration-300 flex flex-col items-center justify-center gap-4 ${isDragActive
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : isDragReject
                            ? 'border-rose-500 bg-rose-500/10'
                            : 'border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/20'
                    }`}
            >
                <input {...getInputProps()} />

                {isLoading ? (
                    <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                        <p className="text-indigo-400 font-medium tracking-tight">Procesando archivo...</p>
                    </div>
                ) : file ? (
                    <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                        <div className={`p-4 rounded-2xl ${isPDF ? 'bg-orange-500/20 text-orange-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                            {isPDF ? <FileText size={48} /> : <FileSpreadsheet size={48} />}
                        </div>
                        <div className="text-center">
                            <p className="text-white font-semibold text-lg truncate max-w-[200px]">{file.name}</p>
                            <p className="text-slate-500 text-sm">{(file.size / 1024).toFixed(2)} KB</p>
                        </div>
                        <button
                            onClick={clearFile}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                        <div className="flex items-center gap-2 text-indigo-400">
                            <CheckCircle size={16} />
                            <span className="text-sm font-medium">Archivo seleccionado correctamente</span>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600/20 group-hover:text-indigo-500 transition-all duration-500">
                            <UploadIcon size={32} />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                                {isDragActive ? 'Suelta el archivo aquí' : 'Sube tu documento'}
                            </h3>
                            <p className="text-slate-500 max-w-[250px] mx-auto text-sm">
                                Arrastra y suelta tu archivo PDF o Excel aquí, o haz clic para buscar.
                            </p>
                        </div>
                        <div className="flex gap-4 mt-2">
                            <div className="px-4 py-1.5 rounded-full bg-slate-800 text-slate-400 text-xs font-medium border border-slate-700 group-hover:border-indigo-500/30">PDF</div>
                            <div className="px-4 py-1.5 rounded-full bg-slate-800 text-slate-400 text-xs font-medium border border-slate-700 group-hover:border-indigo-500/30">Excel</div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

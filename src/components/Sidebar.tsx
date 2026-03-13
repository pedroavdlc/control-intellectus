'use client';

import Link from 'next/link';
import {
    LayoutDashboard,
    FileText,
    FileSpreadsheet,
    MapIcon,
    Info,
    BarChart3,
    Database,
    Shield
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const menuItems = [
    { name: 'Panel Maestro', icon: LayoutDashboard, path: '/' },
    { name: 'Control de Excel', icon: Database, path: '/control' },
    { name: 'Auditoría Interna', icon: BarChart3, path: '/auditoria' },
    { name: 'Fichas Tácticas', icon: FileText, path: '/pdfs' },
    { name: 'Análisis Sabana', icon: FileSpreadsheet, path: '/excel' },
    { name: 'Monitor Activo', icon: MapIcon, path: '/geo' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <>
            {/* The Sidebar Body */}
            <aside className={`flex-shrink-0 h-screen bg-zinc-950 text-zinc-300 border-r border-white/5 flex flex-col z-50 transition-all duration-300 overflow-hidden relative ${isSidebarOpen ? 'w-[260px]' : 'w-0'}`}>
                <div className="min-w-[260px] h-full flex flex-col">
                    <div className="p-6 pb-8 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-[0_0_15px_rgba(37,99,235,0.2)] border border-blue-400/20 group cursor-default transition-transform hover:scale-105">
                        <Shield size={20} className="fill-white/10" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white tracking-widest leading-none uppercase">Intellectus</h1>
                        <p className="text-[9px] font-bold text-blue-500 uppercase tracking-[0.2em] mt-1.5 opacity-80">Security v4.0</p>
                    </div>
                </div>
                <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto no-scrollbar">
                <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-4 px-4 opacity-70">Operaciones Tácticas</div>
                {menuItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            key={item.name}
                            href={item.path}
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group relative ${isActive
                                ? 'bg-blue-600/10 text-white border border-blue-500/20'
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
                                }`}
                        >
                            <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className={`transition-colors ${isActive ? 'text-blue-400' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                            <span className={`text-[12px] tracking-wide uppercase ${isActive ? 'font-bold' : 'font-medium'}`}>{item.name}</span>

                            {isActive && (
                                <div className="absolute left-0 w-1 h-5 bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/5">
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-zinc-400 mb-3">
                        <Info size={14} className="text-blue-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Status: Active</span>
                    </div>
                            <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full w-2/3 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Collapsible Tab Separator */}
            <div className="relative z-[60] flex items-center h-full">
                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="absolute left-0 w-6 h-20 bg-zinc-950 border-y border-r border-white/10 rounded-r-md flex items-center justify-center text-zinc-500 hover:text-white transition-colors shadow-lg hover:bg-zinc-800"
                    style={{ transform: 'translateX(0)' }}
                >
                    {isSidebarOpen ? <span className="transform rotate-180 text-[10px] text-blue-500 font-bold">◄</span> : <span className="text-[10px] text-blue-500 font-bold">►</span>}
                </button>
            </div>
        </>
    );
}

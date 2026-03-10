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

const menuItems = [
    { name: 'Panel Maestro', icon: LayoutDashboard, path: '/' },
    { name: 'Base de Control', icon: Database, path: '/control' },
    { name: 'Fichas Tácticas', icon: FileText, path: '/pdfs' },
    { name: 'Análisis Sabana', icon: BarChart3, path: '/excel' },
    { name: 'Monitor Activo', icon: MapIcon, path: '/geo' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-[#05070a] text-slate-300 border-r border-white/[0.03] flex flex-col z-50">
            <div className="p-8 pb-10 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_25px_rgba(79,70,229,0.3)] border border-white/10 group cursor-default transition-transform hover:scale-105">
                        <Shield size={24} className="fill-white/10" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-white tracking-[0.2em] leading-none uppercase">Intellectus</h1>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.3em] mt-1.5 opacity-80">Security v4.0</p>
                    </div>
                </div>
                <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto no-scrollbar">
                <div className="text-[9px] font-black text-slate-700 uppercase tracking-[0.35em] mb-6 px-4 opacity-50">Operaciones Tácticas</div>
                {menuItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            key={item.name}
                            href={item.path}
                            className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-500 group relative ${isActive
                                ? 'bg-indigo-600/10 text-white shadow-inner'
                                : 'text-slate-600 hover:text-slate-300 hover:bg-white/[0.02]'
                                }`}
                        >
                            <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className={`transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-700 group-hover:text-slate-500'}`} />
                            <span className={`text-[13px] tracking-tight uppercase ${isActive ? 'font-black' : 'font-bold'}`}>{item.name}</span>

                            {isActive && (
                                <>
                                    <div className="absolute right-0 w-1 h-5 bg-indigo-500 rounded-l-full shadow-[0_0_15px_rgba(99,102,241,1)]" />
                                    <div className="absolute inset-0 bg-indigo-500/5 rounded-2xl border border-indigo-500/20" />
                                </>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-6 border-t border-white/[0.03]">
                <div className="bg-slate-900/30 rounded-2xl p-4 border border-white/[0.03]">
                    <div className="flex items-center gap-3 text-slate-500">
                        <Info size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Status: Active</span>
                    </div>
                    <div className="mt-3 w-full bg-slate-800/50 h-1 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full w-2/3 shadow-[0_0_8px_rgba(99,102,241,1)]" />
                    </div>
                </div>
            </div>
        </aside>
    );
}

'use client';

import Link from 'next/link';
import {
    LayoutDashboard,
    FileText,
    FileSpreadsheet,
    MapIcon,
    LogOut,
    Info,
    BarChart3,
    Database
} from 'lucide-react';
import { usePathname } from 'next/navigation';

const menuItems = [
    { name: 'Panel Principal', icon: LayoutDashboard, path: '/' },
    { name: 'Control Maestro', icon: Database, path: '/control' },
    { name: 'Documentos PDF', icon: FileText, path: '/pdfs' },
    { name: 'Editor Excel', icon: BarChart3, path: '/excel' },
    { name: 'Monitor Geo', icon: MapIcon, path: '/geo' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-950 text-slate-300 border-r border-white/5 flex flex-col z-50">
            <div className="p-8 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/40">
                    <ActivityIcon size={22} />
                </div>
                <h1 className="text-xl font-black text-white tracking-tighter">INTELLECTUS</h1>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
                <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 px-4">Operaciones</div>
                {menuItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            key={item.name}
                            href={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative ${isActive
                                ? 'bg-indigo-600/10 text-white border border-indigo-500/20'
                                : 'text-slate-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <item.icon size={18} className={isActive ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-400'} />
                            <span className="text-sm font-bold tracking-tight">{item.name}</span>
                            {isActive && (
                                <div className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[2px_0_10px_rgba(99,102,241,0.5)]" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/5 space-y-1">
                <Link href="/help" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:text-white transition-colors">
                    <Info size={18} />
                    <span className="text-sm font-bold">Documentación</span>
                </Link>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors">
                    <LogOut size={18} />
                    <span className="text-sm font-bold">Desconexión</span>
                </button>
            </div>
        </aside>
    );
}

function ActivityIcon({ size }: { size: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-activity"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    );
}

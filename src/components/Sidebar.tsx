'use client';

import Link from 'next/link';
import { LayoutDashboard, FileText, FileSpreadsheet, MapIcon, Settings, LogOut, Info } from 'lucide-react';
import { usePathname } from 'next/navigation';

const menuItems = [
    { name: 'Panel Principal', icon: LayoutDashboard, path: '/' },
    { name: 'Documentos PDF', icon: FileText, path: '/pdfs' },
    { name: 'Control Excel', icon: FileSpreadsheet, path: '/excel' },
    { name: 'Geolocalización', icon: MapIcon, path: '/geo' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col z-50">
            <div className="p-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                    <MapIcon size={24} />
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight">Intellectus</h1>
            </div>

            <nav className="flex-1 px-4 py-8 space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4 px-2">Navegación</div>
                {menuItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            key={item.name}
                            href={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${isActive
                                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
                                    : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                        >
                            <item.icon size={20} className={isActive ? 'text-indigo-500' : 'text-slate-500 group-hover:text-white'} />
                            <span className="font-medium">{item.name}</span>
                            {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-glow" />}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 mt-auto border-t border-slate-800/50 space-y-2">
                <Link href="/help" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:text-white transition-colors">
                    <Info size={20} />
                    <span>Soporte</span>
                </Link>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors">
                    <LogOut size={20} />
                    <span>Cerrar Sesión</span>
                </button>
            </div>

            <style jsx>{`
        .shadow-glow {
          box-shadow: 0 0 8px #6366f1;
        }
      `}</style>
        </aside>
    );
}

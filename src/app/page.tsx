'use client';

import { useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import Map, { MapMarker } from '@/components/Map';
import FileUpload from '@/components/Upload';
import DataTable from '@/components/DataTable';
import {
  FileText,
  Map as MapIcon,
  FileSpreadsheet,
  Navigation,
  PhoneCall,
  History,
  TrendingUp,
  Activity,
  User,
  Bell,
  Search
} from 'lucide-react';

export default function Dashboard() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelCols, setExcelCols] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    pdfs: 0,
    excels: 0,
    markers: 0,
    phones: 0
  });

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', file);

    const isPDF = file.type === 'application/pdf';
    const endpoint = isPDF ? '/api/process/pdf' : '/api/process/excel';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();

      if (result.success) {
        if (isPDF) {
          const { lat, lng, phone, address, date } = result.data;
          if (lat && lng) {
            const newMarker = {
              id: `${Date.now()}`,
              lat,
              lng,
              label: address || 'Ubicación extraída',
              phone: phone,
              radius: 500 // 500m radius as sample
            };
            setMarkers(prev => [...prev, newMarker]);
            setStats(prev => ({ ...prev, pdfs: prev.pdfs + 1, markers: prev.markers + 1, phones: prev.phones + 1 }));
          }
        } else {
          setExcelData(result.data);
          setExcelCols(result.columns);
          setStats(prev => ({ ...prev, excels: prev.excels + 1 }));
        }
      } else {
        alert("Error: " + result.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error al procesar el archivo");
    } finally {
      setIsProcessing(false);
    }
  };

  const mapCenter = useMemo(() => {
    if (markers.length > 0) {
      return [markers[markers.length - 1].lat, markers[markers.length - 1].lng] as [number, number];
    }
    return [19.4326, -99.1332] as [number, number];
  }, [markers]);

  return (
    <div className="flex bg-slate-950 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">Panel de Intellectus</h1>
            <p className="text-slate-500 text-lg">Visualización y gestión de datos geo-pdf y excel</p>
          </div>
          <div className="flex items-center gap-6 bg-slate-900/50 border border-slate-800 rounded-full px-6 py-3">
            <div className="flex gap-4 border-r border-slate-800 pr-4 mr-4">
              <div className="relative cursor-pointer hover:bg-slate-800 p-2 rounded-full transition-colors">
                <Bell size={20} className="text-slate-400" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-900 pointer-events-none" />
              </div>
              <div className="relative group cursor-pointer hover:bg-slate-800 p-2 rounded-full transition-colors">
                <Search size={20} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold text-white leading-none">Administrador</p>
                <p className="text-xs text-slate-500 mt-1">Socio Prime</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white border-2 border-slate-800 shadow-xl shadow-indigo-600/10 active:scale-95 transition-transform cursor-pointer">
                <User size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard title="PDFs Procesados" value={stats.pdfs} icon={FileText} color="text-indigo-400" bgColor="bg-indigo-500/10" trend="+12%" />
          <StatCard title="Números Extraídos" value={stats.phones} icon={PhoneCall} color="text-cyan-400" bgColor="bg-cyan-500/10" trend="+45%" />
          <StatCard title="Ubicaciones en Mapa" value={stats.markers} icon={MapIcon} color="text-emerald-400" bgColor="bg-emerald-500/10" trend="+31%" />
          <StatCard title="Excels Gestionados" value={stats.excels} icon={FileSpreadsheet} color="text-amber-400" bgColor="bg-amber-500/10" trend="+8%" />
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
          {/* Map Column */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
              <Map markers={markers} center={mapCenter} zoom={13} />
            </div>

            {excelData.length > 0 && (
              <div className="animate-in slide-in-from-bottom-5 duration-700">
                <DataTable columns={excelCols} data={excelData} />
              </div>
            )}
          </div>

          {/* Controls Column */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            <div className="glass p-8 rounded-3xl border border-slate-700/50 flex flex-col gap-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2 group cursor-pointer">
                <TrendingUp size={20} className="text-indigo-400 group-hover:rotate-12 transition-transform" />
                Cargar Informe
              </h3>
              <FileUpload onFileSelect={handleFile} isLoading={isProcessing} />

              <div className="space-y-4 pt-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Reciente</h4>
                {markers.slice(-3).reverse().map(m => (
                  <div key={m.id} className="flex items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800 hover:border-indigo-500/30 transition-all hover:bg-slate-800 group cursor-pointer">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Navigation size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{m.label}</p>
                      <p className="text-xs text-slate-500">{m.phone}</p>
                    </div>
                    <div className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <TrendingUp size={16} />
                    </div>
                  </div>
                ))}
                {markers.length === 0 && (
                  <div className="py-12 border border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-600 grayscale opacity-40">
                    <History size={48} />
                    <p className="text-sm mt-4 font-medium">No hay registros recientes</p>
                  </div>
                )}
              </div>
            </div>

            <div className="glass p-8 rounded-3xl border border-slate-700/50 flex flex-col gap-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-indigo-500/10 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity size={20} className="text-cyan-400" />
                Actividad del Sistema
              </h3>
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Extracción de Datos</span>
                    <span className="text-indigo-400 font-bold">94%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full w-[94%]" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Precisión de Geoposición</span>
                    <span className="text-cyan-400 font-bold">88%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full w-[88%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bgColor, trend }: any) {
  return (
    <div className="glass p-6 rounded-3xl border border-slate-700/50 hover:border-indigo-500/30 transition-all duration-300 group cursor-default shadow-xl shadow-black/20">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${bgColor} ${color} group-hover:scale-110 transition-transform duration-500`}>
          <Icon size={24} />
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400">{trend}</span>
      </div>
      <div>
        <p className="text-slate-400 font-medium h-[1.2rem] mb-1">{title}</p>
        <p className="text-4xl font-black text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
}

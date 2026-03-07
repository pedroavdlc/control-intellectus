'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import FileUpload from '@/components/Upload';
import DataTable from '@/components/DataTable';
import ControlModal from '@/components/ControlModal';
import { MapMarker, LocationPoint } from '@/types/map';
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
  Search,
  Calendar,
  ChevronRight,
  Clock,
  Database,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Check
} from 'lucide-react';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-slate-900/50 animate-pulse rounded-3xl flex items-center justify-center text-slate-500 font-medium font-sans">Cargando Mapa...</div>
});

export default function Dashboard() {
  const [history, setHistory] = useState<Record<string, LocationPoint[]>>({});
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [viewedPoint, setViewedPoint] = useState<[number, number] | null>(null);

  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelCols, setExcelCols] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [controlModalOpen, setControlModalOpen] = useState(false);
  const [pendingControlData, setPendingControlData] = useState<any>(null);
  const [lastSavedInfo, setLastSavedInfo] = useState<{ folder: string, file: string } | null>(null);

  const [stats, setStats] = useState({
    pdfs: 0,
    excels: 0,
    markers: 0,
    phones: 0
  });

  useEffect(() => {
    const saved = localStorage.getItem('intellectus_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistory(parsed);
        const phones = Object.keys(parsed);
        if (phones.length > 0) {
          setSelectedPhone(phones[0]);
          setStats(s => ({
            ...s,
            phones: phones.length,
            markers: Object.values(parsed).flat().length
          }));
        }
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    if (Object.keys(history).length > 0) {
      localStorage.setItem('intellectus_history', JSON.stringify(history));
    }
  }, [history]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    setLastSavedInfo(null);
    const formData = new FormData();
    formData.append('file', file);

    const isPDF = file.type === 'application/pdf';
    const endpoint = isPDF ? '/api/process/pdf' : '/api/process/excel';

    try {
      const res = await fetch(endpoint, { method: 'POST', body: formData });
      const result = await res.json();

      if (result.success) {
        // Prepare base64 for archiving
        const base64 = await fileToBase64(file);

        if (isPDF) {
          setPendingControlData({
            ...result.data,
            type: 'GEO',
            base64,
            fileName: file.name
          });
          setControlModalOpen(true);
        } else {
          const firstRow = result.data[0] || {};
          const phoneInRow = firstRow['Numero'] || firstRow['MSISDN'] || firstRow['Teléfono'] || 'Desconocido';
          const folioInRow = firstRow['Folio'] || firstRow['ID'] || 'S/F';
          const companyInRow = firstRow['Compañía'] || firstRow['Carrier'] || 'Desconocida';

          setExcelData(result.data);
          setExcelCols(result.columns);
          setStats(prev => ({ ...prev, excels: prev.excels + 1 }));

          setPendingControlData({
            phone: phoneInRow,
            folio: folioInRow,
            company: companyInRow,
            type: 'Sabana',
            result: 'Positivo',
            date: new Date().toLocaleDateString('es-ES'),
            address: 'Historial de llamadas (Sábana)',
            base64,
            fileName: file.name
          });
          setControlModalOpen(true);
        }
      } else { alert("Error: " + result.error); }
    } catch (e) { alert("Error al procesar el archivo"); } finally { setIsProcessing(false); }
  };

  const saveControlEntry = async (formData: any) => {
    try {
      const { phone, type, base64, fileName } = pendingControlData;

      // 1. Map Update (GEO only)
      if (type === 'GEO' && pendingControlData.lat && pendingControlData.lng) {
        const { lat, lng, address, date } = pendingControlData;
        const newPoint: LocationPoint = {
          id: `${Date.now()}`,
          lat, lng, address: address || 'Ubicación extraída', phone, date: date || new Date().toLocaleString(), timestamp: Date.now()
        };
        setHistory(prev => {
          const deviceHistory = prev[phone] || [];
          return { ...prev, [phone]: [newPoint, ...deviceHistory] };
        });
        setSelectedPhone(phone);
        setViewedPoint([lat, lng]);
        setStats(prev => ({
          ...prev,
          markers: prev.markers + 1,
          phones: Object.keys(history).includes(phone) ? prev.phones : prev.phones + 1
        }));
      }

      setStats(prev => ({
        ...prev,
        pdfs: type === 'GEO' ? prev.pdfs + 1 : prev.pdfs,
        excels: type === 'Sabana' ? prev.excels + 1 : prev.excels
      }));

      // 2. API Save with Archiving
      const res = await fetch('/api/intellectus/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          phone: phone, // Pass phone for folder naming
          fileContent: base64,
          fileName: fileName
        })
      });

      const saveRes = await res.json();
      if (saveRes.success) {
        setLastSavedInfo({
          folder: saveRes.folderPath,
          file: saveRes.filePath
        });
      }

    } catch (e) { console.error(e); }
  };

  const markers: MapMarker[] = useMemo(() => {
    if (!selectedPhone || !history[selectedPhone]) return [];
    return history[selectedPhone].map(p => ({
      id: p.id, lat: p.lat, lng: p.lng, label: p.address, phone: p.phone, radius: 300
    }));
  }, [history, selectedPhone]);

  const mapCenter = useMemo(() => {
    if (viewedPoint) return viewedPoint;
    if (markers.length > 0) return [markers[0].lat, markers[0].lng] as [number, number];
    return [19.4326, -99.1332] as [number, number];
  }, [markers, viewedPoint]);

  return (
    <>
      <ControlModal
        isOpen={controlModalOpen}
        initialData={pendingControlData || {}}
        onClose={() => setControlModalOpen(false)}
        onSave={saveControlEntry}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="animate-in fade-in slide-in-from-left-4 duration-700">
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">
            Intellectus Intelligence
          </h1>
          <p className="text-slate-400 text-lg font-medium">Panel Principal de Operaciones</p>
        </div>
        <div className="flex items-center gap-6 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl px-6 py-3 shadow-2xl">
          <div className="flex gap-2 pr-4 border-r border-slate-800">
            <NavIcon icon={Bell} badge />
            <NavIcon icon={Search} />
          </div>
          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="text-right">
              <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">Agente Prime</p>
              <div className="flex items-center justify-end gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">En Línea</p>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:rotate-6 transition-transform">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-white">
                <User size={22} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Alert for Last Saved File */}
      {lastSavedInfo && (
        <div className="mb-8 glass bg-emerald-500/10 border-emerald-500/20 p-6 rounded-[2rem] flex items-center justify-between animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <Check size={20} />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Registro Guardado y Archivado</p>
              <div className="flex items-center gap-2 mt-1">
                <FolderOpen size={12} className="text-slate-500" />
                <p className="text-[10px] text-slate-400 font-mono tracking-tighter truncate max-w-lg">{lastSavedInfo.folder}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              // This is a browser trick to "reveal" local path by copying it
              navigator.clipboard.writeText(lastSavedInfo.folder);
              alert("Ruta de la carpeta copiada al portapapeles:\n" + lastSavedInfo.folder);
            }}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-5 py-2.5 rounded-2xl font-black text-xs transition-all shadow-lg active:scale-95"
          >
            <FolderOpen size={14} />
            COPIAR RUTA
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
        <StatCard title="Geolocalizaciones" value={stats.pdfs} icon={FileText} color="text-indigo-400" bgColor="bg-indigo-500/10" trend="+12%" />
        <StatCard title="Sábanas (Excels)" value={stats.excels} icon={FileSpreadsheet} color="text-amber-400" bgColor="bg-amber-500/10" trend="+8%" />
        <StatCard title="Dispositivos" value={stats.phones} icon={PhoneCall} color="text-cyan-400" bgColor="bg-cyan-500/10" trend="+45%" />
        <StatCard title="Puntos de Interés" value={stats.markers} icon={MapIcon} color="text-emerald-400" bgColor="bg-emerald-500/10" trend="+31%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 flex flex-col gap-8 animate-in fade-in slide-in-from-left-4 duration-1000 delay-200">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
            <Map markers={markers} center={mapCenter} zoom={15} />
            <div className="absolute top-6 left-6 z-10 flex gap-2 flex-wrap max-w-[80%]">
              {Object.keys(history)
                .sort((a, b) => (history[b][0].timestamp - history[a][0].timestamp))
                .map(phone => (
                  <button
                    key={phone}
                    onClick={() => { setSelectedPhone(phone); setViewedPoint(null); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border backdrop-blur-md transition-all ${selectedPhone === phone
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/40'
                        : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:bg-slate-800'
                      }`}
                  >
                    {phone}
                  </button>
                ))}
            </div>
          </div>
          {excelData.length > 0 && <DataTable columns={excelCols} data={excelData} />}
        </div>

        <div className="lg:col-span-4 flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-1000 delay-200">
          <div className="glass p-8 rounded-[2rem] border border-white/5 shadow-2xl">
            <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400"><TrendingUp size={18} /></div>
              Cargar Archivo
            </h3>
            <FileUpload onFileSelect={handleFile} isLoading={isProcessing} />
            <p className="text-[10px] text-slate-500 mt-4 font-bold uppercase tracking-wider text-center">
              PDF = Geolocalización | EXCEL = Sábana
            </p>
          </div>

          <div className="glass p-8 rounded-[2rem] border border-white/5 shadow-2xl flex-1 flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400"><History size={18} /></div>
                Cronograma Geo
              </h3>
              {selectedPhone && <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-800/50 px-3 py-1 rounded-full">{history[selectedPhone]?.length || 0} Registros</span>}
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {selectedPhone && history[selectedPhone]?.map((point, idx) => (
                <button
                  key={point.id}
                  onClick={() => setViewedPoint([point.lat, point.lng])}
                  className="w-full text-left bg-slate-900/30 hover:bg-slate-800/50 border border-white/5 hover:border-indigo-500/30 p-5 rounded-2xl transition-all group flex items-start gap-4"
                >
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                    {idx !== history[selectedPhone].length - 1 && <div className="w-0.5 h-12 bg-slate-800" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Clock size={12} />
                      <span className="text-[11px] font-bold uppercase tracking-wider">{point.date}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-200 line-clamp-2 mb-1">{point.address}</p>
                    <div className="flex items-center gap-2 text-xs text-indigo-400/80 font-medium">
                      <Navigation size={10} /><span>Ver en mapa</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-700 group-hover:text-indigo-500 transition-colors shrink-0 mt-1" />
                </button>
              ))}
              {(!selectedPhone || !history[selectedPhone]) && (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-30 grayscale">
                  <Calendar size={64} className="text-slate-700 mb-4" />
                  <p className="text-lg font-bold">Sin Historial Geo</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </>
  );
}

function StatCard({ title, value, icon: Icon, color, bgColor, trend }: any) {
  return (
    <div className="glass p-7 rounded-[2rem] border border-white/5 hover:border-indigo-500/20 transition-all duration-500 group shadow-xl">
      <div className="flex items-start justify-between mb-6">
        <div className={`p-4 rounded-2xl ${bgColor} ${color} group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}><Icon size={26} /></div>
        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 uppercase tracking-wider">{trend}</span>
      </div>
      <div>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-5xl font-black text-white tracking-tighter">{value}</p>
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function NavIcon({ icon: Icon, badge }: any) {
  return (
    <div className="relative p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
      <Icon size={20} className="text-slate-400 group-hover:text-white transition-colors" />
      {badge && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-900" />}
    </div>
  );
}

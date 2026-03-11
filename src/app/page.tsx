'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Plus,
  Search,
  Map as MapIcon,
  LayoutDashboard,
  History,
  Navigation,
  Clock,
  ChevronRight,
  PhoneCall,
  Radio,
  Loader2,
  Crosshair,
  RefreshCw,
  FileText,
  Download,
  X
} from 'lucide-react';
import { MapMarker } from '@/types/map';
import Sidebar from '@/components/Sidebar';
import ControlModal from '@/components/ControlModal';
import DataTable from '@/components/DataTable';
import FileUpload from '@/components/Upload';
import Timeline from '@/components/Timeline';

function parseDate(raw: string): { date: string; time: string; timestamp: number } {
  if (!raw) return { date: '—', time: '', timestamp: 0 };
  let d = new Date(raw);
  if (isNaN(d.getTime())) {
    const m = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})[\s,]+(\d{1,2}):(\d{2})/);
    if (m) d = new Date(`${m[2]}/${m[1]}/${m[3]} ${m[4]}:${m[5]}`);
  }
  if (isNaN(d.getTime())) return { date: raw.split(/[\s,]+/)[0] || raw, time: '', timestamp: 0 };
  return {
    date: d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }),
    timestamp: d.getTime()
  };
}

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-900/50 animate-pulse rounded-3xl" />
});

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelCols, setExcelCols] = useState<string[]>([]);
  const [history, setHistory] = useState<Record<string, any[]>>({});
  const [providers, setProviders] = useState<Record<string, string | null>>({});
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.4326, -99.1332]);
  const [viewedPoint, setViewedPoint] = useState<[number, number] | null>(null);
  const [activeTimelineIndex, setActiveTimelineIndex] = useState(0);

  const [showTowers, setShowTowers] = useState(false);
  const [towerMarkers, setTowerMarkers] = useState<MapMarker[]>([]);
  const [isFetchingTowers, setIsFetchingTowers] = useState(false);
  const [geoCompany, setGeoCompany] = useState<string | null>(null);
  const [sourceAntennaCenter, setSourceAntennaCenter] = useState<[number, number] | null>(null);
  const [towerRange, setTowerRange] = useState<number>(0);
  const [deviceCenter, setDeviceCenter] = useState<[number, number] | null>(null);
  const [cameraFlyTo, setCameraFlyTo] = useState<[number, number] | null>(null);
  const [antennaSector, setAntennaSector] = useState<{ lat: number; lng: number; azimuth: number; range: number; widthDeg: number; azimuthSource: string } | null>(null);
  const [showAll, setShowAll] = useState(false); // show all history points on map simultaneously

  // Stable string key from viewedPoint to use in useEffect deps (avoids array-size-change error)
  const viewedKey = viewedPoint ? `${viewedPoint[0]},${viewedPoint[1]}` : 'null';

  // Derived center for map view - STABILIZED to avoid object-identity changes causing loops
  const center = useMemo(() => {
    return (viewedPoint || (selectedPhone && history[selectedPhone] && history[selectedPhone].length > 0 ? [history[selectedPhone][0].lat, history[selectedPhone][0].lng] : mapCenter)) as [number, number];
  }, [viewedPoint, selectedPhone, history, mapCenter]);

  // Load persistent history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch('/api/intellectus/history');
        const result = await res.json();
        if (result.success && result.history) {
          setHistory(result.history);
          if (result.providers) setProviders(result.providers);
        }
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
    loadHistory();
  }, []);

  // Helper to normalize phone numbers for lookup
  const normalizePhone = (p: string) => {
    const clean = (p || '').replace(/\D/g, '');
    if (clean.length > 10 && clean.startsWith('52')) return clean.substring(2);
    if (clean.length > 10 && clean.startsWith('044')) return clean.substring(3);
    return clean;
  };

  // Haversine distance helper
  const haversineDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const toRad = (d: number) => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Stable string key from center to avoid object comparison issues
  const centerKey = `${center[0].toFixed(5)},${center[1].toFixed(5)}`;

  // Compute nearest source antenna whenever towers or company changes
  useEffect(() => {
    if (!geoCompany || towerMarkers.length === 0) { 
      if (sourceAntennaCenter) setSourceAntennaCenter(null);
      return; 
    }
    const searchCompany = geoCompany.toUpperCase();
    
    const matching = towerMarkers.filter(t => {
      const tc = ((t as any).company || '').toUpperCase();
      return tc && (tc.includes(searchCompany) || searchCompany.includes(tc)) &&
        haversineDist(center[0], center[1], t.lat, t.lng) <= 1200;
    });
    
    if (matching.length === 0) { 
      if (sourceAntennaCenter) setSourceAntennaCenter(null);
      return; 
    }

    // Pick the closest one
    const closest = matching.reduce((best, t) =>
      haversineDist(center[0], center[1], t.lat, t.lng) < haversineDist(center[0], center[1], best.lat, best.lng) ? t : best
    );

    // Only update if the distance change is significant (> 1 meter) or if it's first time
    const currentDist = sourceAntennaCenter ? haversineDist(sourceAntennaCenter[0], sourceAntennaCenter[1], closest.lat, closest.lng) : 999;
    if (currentDist > 1) {
      setSourceAntennaCenter([closest.lat, closest.lng]);
    }
  }, [towerMarkers, geoCompany, centerKey]); // sourceAntennaCenter removed from deps to prevent closure feedback loops

  // Fetch REAL Towers from OpenCellID — stable deps, no array-size-change
  useEffect(() => {
    let isMounted = true;

    async function fetchRealTowers() {
      if (!showTowers) {
        setTowerMarkers([]);
        return;
      }

      // Resolve center inside effect
      let lat: number;
      let lng: number;

      if (viewedPoint) {
        [lat, lng] = viewedPoint;
      } else if (selectedPhone && history[selectedPhone] && history[selectedPhone].length > 0) {
        lat = history[selectedPhone][0].lat;
        lng = history[selectedPhone][0].lng;
      } else {
        [lat, lng] = mapCenter;
      }

      setIsFetchingTowers(true);
      try {
        const response = await fetch(`/api/intellectus/towers?lat=${lat}&lon=${lng}`);
        const result = await response.json();
        if (result.success && isMounted) {
          setTowerMarkers(result.towers);
        }
      } catch (error) {
        console.error('Error loading real antennas:', error);
      } finally {
        if (isMounted) setIsFetchingTowers(false);
      }
    }

    fetchRealTowers();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTowers, selectedPhone, viewedKey, centerKey]);

  // Force-refresh towers bypassing the 30-min cache
  const refreshTowers = async () => {
    const ref = deviceCenter || center;
    if (!ref) return;
    setIsFetchingTowers(true);
    try {
      const res = await fetch(`/api/intellectus/towers?lat=${ref[0]}&lon=${ref[1]}&force=true`);
      const result = await res.json();
      if (result.success) setTowerMarkers(result.towers);
    } catch (e) {
      console.error('Force refresh failed:', e);
    } finally {
      setIsFetchingTowers(false);
    }
  };

  const markers = useMemo(() => {
    let allMarkers: MapMarker[] = [];

    // When showing all history points for a phone, skip the regular per-device summary markers
    if (showAll && selectedPhone) return allMarkers;

    Object.keys(history).forEach(phone => {
      const lastPoint = history[phone] && history[phone].length > 0 ? history[phone][0] : null;
      if (!lastPoint) return;

      allMarkers.push({
        id: `dev-${phone}`,
        lat: lastPoint.lat,
        lng: lastPoint.lng,
        label: `Objetivo: ${phone}`,
        phone: phone,
        radius: lastPoint.radius || 50,
        type: 'device'
      });

      if (lastPoint.antennaLat && lastPoint.antennaLng) {
        allMarkers.push({
          id: `ant-${phone}`,
          lat: lastPoint.antennaLat,
          lng: lastPoint.antennaLng,
          label: `Antena Origen: ${lastPoint.lac || 'N/A'}-${lastPoint.cid || 'N/A'}`,
          radius: 300,
          type: 'antenna'
        });
      }
    });

    if (viewedPoint) {
      let antennaMarker: MapMarker | null = null;
      if (selectedPhone && history[selectedPhone]) {
        const point = history[selectedPhone].find(p => p.lat === viewedPoint[0] && p.lng === viewedPoint[1]);
        if (point?.antennaLat && point?.antennaLng) {
          antennaMarker = {
            id: 'viewed-ant',
            lat: point.antennaLat,
            lng: point.antennaLng,
            label: `Antena Origen: ${point.lac || 'N/A'}`,
            radius: 500,
            type: 'antenna'
          };
        }
      }

      const viewedRadius = selectedPhone && history[selectedPhone]
        ? (history[selectedPhone].find((p: any) => p.lat === viewedPoint[0] && p.lng === viewedPoint[1])?.radius || 100)
        : 100;

      allMarkers.push({
        id: 'viewed',
        lat: viewedPoint[0],
        lng: viewedPoint[1],
        label: 'Objetivo Seleccionado',
        radius: viewedRadius,
        type: 'device'
      });

      if (antennaMarker) allMarkers.push(antennaMarker);
    }

    return allMarkers;
  }, [history, viewedPoint, selectedPhone, showAll]);

  // All-points markers: shown when showAll mode is active — every history point for the phone
  const allPointsMarkers = useMemo((): MapMarker[] => {
    if (!showAll || !selectedPhone) return [];

    // Try exact key first, then fuzzy match (strip non-digits and compare last 10)
    let points = history[selectedPhone];
    if (!points || points.length === 0) {
      const sel10 = selectedPhone.replace(/\D/g, '').slice(-10);
      const fuzzyKey = Object.keys(history).find(k => k.replace(/\D/g, '').slice(-10) === sel10);
      if (fuzzyKey) points = history[fuzzyKey];
    }
    if (!points || points.length === 0) {
      console.warn('[showAll] No points found for phone:', selectedPhone, 'History keys:', Object.keys(history));
      return [];
    }

    const markers = points
      .filter(p => typeof p.lat === 'number' && !isNaN(p.lat) && p.lat !== 0 &&
                   typeof p.lng === 'number' && !isNaN(p.lng) && p.lng !== 0)
      .map((point, idx) => ({
        id: `all-${idx}`,
        lat: point.lat,
        lng: point.lng,
        label: point.date ? String(point.date) : `Punto ${idx + 1}`,
        radius: point.radius ? Number(point.radius) : 300, // 300m fallback
        type: 'device' as const,
        antennaSector: point.antennaSector || null
      }));

    console.log(`[showAll] Rendering ${markers.length} markers for ${selectedPhone}`);
    return markers;
  }, [showAll, selectedPhone, history]);

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', file);
    const isPdf = file.type === 'application/pdf';
    const endpoint = isPdf ? '/api/process/pdf' : '/api/process/excel';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data;

        if (isPdf) {
          const rawPhone = (data.phone || '').replace(/\D/g, '');
          const cleanPhone = normalizePhone(rawPhone);
          
          let rawCompany = (data.company || '').toUpperCase();
          if (!rawCompany || rawCompany === 'DESCONOCIDA' || rawCompany === 'S/N' || rawCompany === 'S/P') {
            const found = providers[cleanPhone] || providers[rawPhone] || providers[data.phone] || '';
            if (found) rawCompany = found.toUpperCase();
          }
          setGeoCompany(rawCompany || null);

          // 1. Initial coordinates from PDF
          const markerLat = data.lat ? parseFloat(data.lat) : 0;
          const markerLng = data.lng ? parseFloat(data.lng) : 0;
          let exactAntennaLat = data.antennaLat ? parseFloat(data.antennaLat) : markerLat;
          let exactAntennaLng = data.antennaLng ? parseFloat(data.antennaLng) : markerLng;

          // 2. Radius calculation
          let finalRadius = 400;
          if (data.radius) {
            let r = parseFloat(data.radius);
            finalRadius = r < 15 ? Math.round(r * 1000) : Math.round(r);
          }

          // Important: Sync history view immediately so 'anteriores' show up on map
          setSelectedPhone(cleanPhone);
          setShowAll(true);

          // 3. Optional cell tower lookup for better sector visualization
          let currentSector = null;
          if (data.mcc && data.mnc && data.lac && data.cid) {
            try {
              const cellRes = await fetch(
                `/api/intellectus/cell?mcc=${data.mcc}&mnc=${data.mnc}&lac=${data.lac}&cellid=${data.cid}`
              );
              const cellResult = await cellRes.json();
              if (cellResult.success && cellResult.antenna) {
                const antennaRange = cellResult.antenna.range ? Math.min(cellResult.antenna.range, 800) : 400;
                finalRadius = data.radius ? finalRadius : antennaRange;
                currentSector = {
                  lat: markerLat,
                  lng: markerLng,
                  azimuth: cellResult.antenna.azimuth ?? 0,
                  range: finalRadius,
                  widthDeg: cellResult.antenna.sectorWidthDeg || 120,
                  azimuthSource: cellResult.antenna.azimuthSource || 'unknown',
                };
              } else {
                const cid = parseInt(String(data.cid) || '0');
                const cellIndex = cid % 256;
                const inferredAzimuth = (cellIndex <= 2 ? cellIndex : (cid % 3)) * 120;
                currentSector = {
                  lat: markerLat,
                  lng: markerLng,
                  azimuth: inferredAzimuth,
                  range: finalRadius,
                  widthDeg: 120,
                  azimuthSource: 'inferred-mod3',
                };
              }
            } catch (e) {
              const cid = parseInt(String(data.cid) || '0');
              const cellIndex = cid % 256;
              const inferredAzimuth = (cellIndex <= 2 ? cellIndex : (cid % 3)) * 120;
              currentSector = {
                lat: markerLat,
                lng: markerLng,
                azimuth: inferredAzimuth,
                range: finalRadius,
                widthDeg: 120,
                azimuthSource: 'inferred-mod3',
              };
            }
          }

          // Apply state updates for map visualization
          setAntennaSector(currentSector);
          setDeviceCenter([markerLat, markerLng]);

          // Set all modal data for saving
          setModalData({
            phone: data.phone || '',
            folio: cleanPhone,
            company: rawCompany,
            date: data.date,
            type: 'GEO',
            result: exactAntennaLat ? 'Positivo' : 'Negativo',
            lat: markerLat,
            lng: markerLng,
            antennaLat: exactAntennaLat,
            antennaLng: exactAntennaLng,
            lac: data.lac,
            cid: data.cid,
            mcc: data.mcc,
            mnc: data.mnc,
            radius: finalRadius,
            antennaSector: currentSector,
            fileId: data.id 
          });
          setShowTowers(true);
        } else {
          setModalData({ type: 'Sabana', excelData: result.data, excelCols: result.columns });
        }
        setIsModalOpen(true);
      } else {
        const errorData = await response.json();
        alert(`Error al procesar el archivo: ${errorData.details || errorData.error || 'Desconocido'}`);
      }
    } catch (error: any) {
      console.error('Error processing file:', error);
      alert(`Error de conexión: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveModal = async (data: any) => {
    if (data.type === 'GEO') {
      const phone = normalizePhone(data.phone || 'S/N');
      const now = new Date();
      const requestedDate = now.toLocaleDateString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
      });

      // Prepare point for immediate local update
      const newPoint = {
        id: Date.now(),
        lat: parseFloat(data.lat || modalData.lat || 19.4326),
        lng: parseFloat(data.lng || modalData.lng || -99.1332),
        antennaLat: modalData.antennaLat,
        antennaLng: modalData.antennaLng,
        lac: modalData.lac,
        cid: modalData.cid,
        radius: modalData.radius ? parseFloat(modalData.radius) : null,
        address: data.area || modalData.address || 'Dirección de búsqueda',
        date: modalData.date || data.date || requestedDate,
        timestamp: now.getTime(),
        antennaSector: modalData.antennaSector || null,
        fileId: modalData.fileId || null
      };

      setHistory(prev => ({ ...prev, [phone]: [newPoint, ...(prev[phone] || [])] }));
      if (data.company) {
        setProviders(prev => ({ ...prev, [phone]: data.company }));
      }
      setActiveTimelineIndex(0);
      setSelectedPhone(phone);
      setViewedPoint(null);
    } else if (data.type === 'Sabana' && modalData.excelData) {
      setExcelCols(modalData.excelCols);
      setExcelData(modalData.excelData);
    }

    // Persist to DB
    const saveRes = await fetch('/api/intellectus/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        lat: modalData.lat,
        lng: modalData.lng,
        antennaLat: modalData.antennaLat,
        antennaLng: modalData.antennaLng,
        radius: modalData.radius,
        antennaSector: modalData.antennaSector,
        fileId: modalData.fileId || null
      }),
    });

    const saveResult = await saveRes.json();
    if (saveResult.success) {
        if (saveResult.excelSaved) {
            alert(`✅ Registro guardado con éxito en Excel (Folio: ${saveResult.numProg})`);
        } else {
            alert(`⚠️ Datos guardados localmente, pero NO se pudo escribir en el Excel Maestro (probablemente está abierto). Por favor registre manualmente o intente procesar de nuevo con el Excel cerrado.`);
        }
    }

    // Reload history to ensure everything is synced
    if (data.type === 'GEO') {
      try {
        const phone = normalizePhone(data.phone || 'S/N');
        const res = await fetch('/api/intellectus/history');
        const result = await res.json();
        if (result.success && result.history) {
          const pts = result.history[phone];
          setHistory(result.history);
          if (result.providers) setProviders(result.providers);
          setSelectedPhone(phone);
          setActiveTimelineIndex(0);
          
          if (pts && pts.length > 0) {
            setShowAll(false);
            setViewedPoint([pts[0].lat, pts[0].lng]);
            setDeviceCenter([pts[0].lat, pts[0].lng]);
            setCameraFlyTo([pts[0].lat, pts[0].lng]);
          } else {
            setShowAll(true);
            setViewedPoint(null);
          }
        }
      } catch (e) {
        console.warn('Could not reload history:', e);
      }
    }

    setIsModalOpen(false);
    setModalData({});
  };

  return (
    <div className="flex w-full h-[100vh] overflow-hidden bg-zinc-950 text-slate-200">
      
      {/* ── Left Sidebar (Targets & File Upload) ── */}
      <div className="w-[320px] flex-shrink-0 bg-[#09090b] border-r border-white/10 flex flex-col z-20 shadow-2xl overflow-hidden relative">
        <div className="p-5 border-b border-white/5 bg-zinc-900/20 whitespace-nowrap">
          <h1 className="text-xl font-bold text-white tracking-widest flex items-center gap-3 uppercase">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
            Discovery
          </h1>
          <p className="text-[9px] text-zinc-500 mt-1.5 uppercase tracking-[0.2em] font-bold">Location Intel System</p>
        </div>

        <div className="p-4 border-b border-white/5 flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">
           <div className="flex items-center gap-2"><div className="w-7 h-3 rounded-full bg-zinc-800 border border-white/10 relative"><div className="absolute left-0.5 top-0.5 w-2 h-2 rounded-full bg-zinc-600"></div></div> MSISDNS</div>
           <div className="flex items-center gap-2"><div className="w-7 h-3 rounded-full bg-blue-500/20 border border-blue-500/50 relative"><div className="absolute right-0.5 top-0.5 w-2 h-2 rounded-full bg-blue-500"></div></div> LOCATIONS</div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-1 bg-zinc-950/50 min-w-[320px]">
             {Object.keys(history)
                .filter(key => history[key] && history[key].length > 0)
                .sort((a, b) => {
                  const timeA = history[a][0].timestamp ? Number(history[a][0].timestamp) : 0;
                  const timeB = history[b][0].timestamp ? Number(history[b][0].timestamp) : 0;
                  return timeB - timeA;
                })
                .map(phone => {
                  const isActive = selectedPhone === phone;
                  return (
                    <button key={phone} onClick={() => { 
                          setSelectedPhone(phone); 
                          setActiveTimelineIndex(0); 
                          if (history[phone] && history[phone].length > 0) {
                              setShowAll(false);
                              const recent = history[phone][0];
                              setViewedPoint([recent.lat, recent.lng]);
                              setDeviceCenter([recent.lat, recent.lng]);
                              setCameraFlyTo([recent.lat, recent.lng]);
                          } else {
                              setShowAll(true);
                              setViewedPoint(null);
                          }
                      }} 
                            className={`w-full flex items-center justify-between px-3 py-3 rounded-lg border transition-all duration-200 group text-left ${isActive ? 'bg-blue-600/10 border-blue-500/30' : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900 hover:border-white/5'}`}>
                      <div className="flex items-center gap-3 w-full">
                        <PhoneCall size={12} className={isActive ? 'text-blue-400' : 'text-zinc-600 group-hover:text-zinc-400'} />
                        <span className={`text-xs font-mono tracking-tight flex-1 ${isActive ? 'text-blue-100 font-bold' : 'font-medium'}`}>{phone}</span>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />}
                      </div>
                    </button>
                  );
                })}
        </div>
        
        <div className="p-4 border-t border-white/5 bg-zinc-900/20 min-w-[320px]">
          <FileUpload onFileSelect={handleFileSelect} isLoading={isProcessing} />
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#09090b] relative z-10 h-[100vh]">
        
        {/* Full Screen Map */}
        <div className="flex-1 w-full bg-[#09090b]">
            {/* Embedded Excel Overlay */}

            {excelData.length > 0 && (
              <div className="absolute top-4 right-4 z-[1001] w-[600px] bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-xl max-h-[50vh] overflow-hidden flex flex-col shadow-2xl">
                 <div className="flex items-center justify-between p-3 border-b border-white/10 bg-zinc-900/50">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Análisis Tabular Excel</span>
                    <button onClick={() => setExcelData([])} className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"><X size={14}/></button>
                 </div>
                 <div className="flex-1 overflow-auto"><DataTable columns={excelCols} data={excelData} /></div>
              </div>
            )}

            <div className="absolute inset-0">
               <Map
                  markers={markers}
                  towerMarkers={towerMarkers}
                  showTowers={showTowers}
                  center={center}
                  zoom={viewedPoint ? 17 : 3}
                  geoCompany={geoCompany}
                  targetCenter={deviceCenter || center}
                  towerRange={towerRange}
                  cameraFlyTo={cameraFlyTo}
                  antennaSector={antennaSector}
                  extraMarkers={showAll ? allPointsMarkers : []}
               />
            </div>
            
            {/* Action Bar (Top of map) */}
            <div className="absolute top-4 left-6 right-4 z-[500] pointer-events-none flex justify-between">
                <div className="bg-[#09090b]/80 backdrop-blur pointer-events-auto rounded shadow-lg border border-white/10 flex p-1">
                   <button className="px-3 py-1 bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 text-xs font-bold text-zinc-300 rounded transition-colors">Discovery Summary</button>
                   <button className="px-3 py-1 hover:bg-zinc-800 border border-transparent text-xs font-bold text-zinc-400 rounded flex gap-2 items-center transition-colors">
                       Locate new <Crosshair size={12} className="text-blue-500"/>
                   </button>
                   {selectedPhone && (
                      <div className="ml-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded flex items-center gap-3">
                         <span className="text-xs font-bold text-blue-100">{selectedPhone}</span>
                         <span className="text-[9px] text-blue-400/70 uppercase tracking-widest">MSISDN</span>
                      </div>
                   )}
                </div>
            </div>

        </div>

        {/* Flush Bottom Timeline Overlaps Map */}
        <div className="absolute bottom-0 left-0 right-0 h-[60px] bg-[#09090b]/90 backdrop-blur shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-[500] flex flex-col justify-center border-t border-white/10">
            {selectedPhone ? (
               <Timeline
                  points={history[selectedPhone] || []}
                  activeIndex={activeTimelineIndex}
                  showAll={showAll}
                  onToggleShowAll={(val) => { setShowAll(val); if (!val) setViewedPoint(null); }}
                  onSelect={(idx, point) => {
                    setActiveTimelineIndex(idx);
                    setShowAll(false);
                    setViewedPoint([point.lat, point.lng]);
                    setDeviceCenter([point.lat, point.lng]);
                    setAntennaSector(point.antennaSector || null);
                  }}
                  onViewPDF={(fileId) => window.open(`/api/files/${fileId}`, '_blank')}
                />
            ) : (
            <div className="flex items-center justify-center gap-3 opacity-30">
                  <Clock size={16} className="text-zinc-500" />
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em]">TIMELINE SCANNER STANDBY</p>
            </div>
            )}
        </div>

      </div>
      
      <ControlModal 
        isOpen={isModalOpen} 
        initialData={modalData} 
        knownProviders={providers}
        onClose={() => { setIsModalOpen(false); setModalData({}); }} 
        onSave={handleSaveModal} 
      />
    </div>
  );

}

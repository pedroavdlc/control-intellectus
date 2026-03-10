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
  RefreshCw
} from 'lucide-react';
import { MapMarker } from '@/types/map';
import Sidebar from '@/components/Sidebar';
import ControlModal from '@/components/ControlModal';
import DataTable from '@/components/DataTable';
import FileUpload from '@/components/Upload';

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
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.4326, -99.1332]);
  const [viewedPoint, setViewedPoint] = useState<[number, number] | null>(null);

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

  // Derived center for map view
  const center = viewedPoint || (selectedPhone && history[selectedPhone] && history[selectedPhone].length > 0 ? [history[selectedPhone][0].lat, history[selectedPhone][0].lng] : mapCenter) as [number, number];

  // Load persistent history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch('/api/intellectus/history');
        const result = await res.json();
        if (result.success && result.history) {
          setHistory(result.history);
        }
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
    loadHistory();
  }, []);

  // Haversine distance helper
  const haversineDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const toRad = (d: number) => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Compute nearest source antenna whenever towers or company changes
  useEffect(() => {
    if (!geoCompany || towerMarkers.length === 0) { setSourceAntennaCenter(null); return; }
    const ref = center;
    const matching = towerMarkers.filter(t => {
      const tc = (t as any).company as string | undefined;
      return tc && (tc.includes(geoCompany) || geoCompany.includes(tc)) &&
        haversineDist(ref[0], ref[1], t.lat, t.lng) <= 1000;
    });
    if (matching.length === 0) { setSourceAntennaCenter(null); return; }
    // Pick the closest one
    const closest = matching.reduce((best, t) =>
      haversineDist(ref[0], ref[1], t.lat, t.lng) < haversineDist(ref[0], ref[1], best.lat, best.lng) ? t : best
    );
    setSourceAntennaCenter([closest.lat, closest.lng]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [towerMarkers, geoCompany]);

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
      } else if (selectedPhone && history[selectedPhone]) {
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
  }, [showTowers, selectedPhone, viewedKey, mapCenter[0], mapCenter[1]]);

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

    Object.keys(history).forEach(phone => {
      const lastPoint = history[phone][0];
      allMarkers.push({
        id: `dev-${phone}`,
        lat: lastPoint.lat,
        lng: lastPoint.lng,
        label: `Objetivo: ${phone}`,
        phone: phone,
        // Use real PDF radius if available, else 50m default
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
    if (!showAll || !selectedPhone || !history[selectedPhone]) return [];
    return history[selectedPhone].map((point, idx) => ({
      id: `all-${idx}`,
      lat: point.lat,
      lng: point.lng,
      label: point.date || `Punto ${idx + 1}`,
      radius: point.radius || 80,
      type: 'device' as const,
    }));
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
          const cleanPhone = (data.phone || '').replace('+52', '');
          const rawCompany = (data.company || '').toUpperCase();
          setGeoCompany(rawCompany || null);

          // 1. marker location (device estimate)
          const markerLat = data.lat ? parseFloat(data.lat) : 0;
          const markerLng = data.lng ? parseFloat(data.lng) : 0;

          // 2. antenna location (circle center) - favor antennaSpecific coordinates from PDF
          let exactAntennaLat = data.antennaLat ? parseFloat(data.antennaLat) : markerLat;
          let exactAntennaLng = data.antennaLng ? parseFloat(data.antennaLng) : markerLng;

          let exactRange = null;
          if (data.radius) {
            let r = parseFloat(data.radius);
            // If radius is small (e.g. 0.384 or 3.5), it's KM. 0.384 -> 384, 1.5 -> 1500, etc.
            exactRange = r < 15 ? Math.round(r * 1000) : Math.round(r);
            console.log(`[PDF] extracted radius: ${data.radius} -> treated as ${exactRange} meters`);
          }

          if (data.mcc && data.mnc && data.lac && data.cid) {
            try {
              const cellRes = await fetch(
                `/api/intellectus/cell?mcc=${data.mcc}&mnc=${data.mnc}&lac=${data.lac}&cellid=${data.cid}`
              );
              const cellResult = await cellRes.json();
              if (cellResult.success && cellResult.antenna) {
                exactAntennaLat = cellResult.antenna.lat;
                exactAntennaLng = cellResult.antenna.lng;
                // PDF range is sovereign. If not, use DB capped at 800m. Default fallback 400m.
                const finalRange = exactRange || (cellResult.antenna.range ? Math.min(cellResult.antenna.range, 800) : 400);
                const sectorInfo = {
                  lat: cellResult.antenna.lat,
                  lng: cellResult.antenna.lng,
                  azimuth: cellResult.antenna.azimuth ?? 0,
                  range: finalRange,
                  widthDeg: cellResult.antenna.sectorWidthDeg || 120,
                  azimuthSource: cellResult.antenna.azimuthSource || 'unknown',
                };
                setAntennaSector(sectorInfo);
                setModalData((prev: any) => ({ ...prev, antennaSector: sectorInfo, radius: finalRange }));
              } else {
                // Cell not found in DB — still draw sector using PDF coords + inferred azimuth
                const cid = parseInt(String(data.cid) || '0');
                const cellIndex = cid % 256;
                const inferredAzimuth = (cellIndex <= 2 ? cellIndex : (cid % 3)) * 120;
                const finalRange = exactRange || 400;
                if (exactAntennaLat && exactAntennaLng) {
                  const sectorInfo = {
                    lat: exactAntennaLat,
                    lng: exactAntennaLng,
                    azimuth: inferredAzimuth,
                    range: finalRange,
                    widthDeg: 120,
                    azimuthSource: 'inferred-mod3',
                  };
                  setAntennaSector(sectorInfo);
                  setModalData((prev: any) => ({ ...prev, antennaSector: sectorInfo, radius: finalRange }));
                }
              }
            } catch (e) {
              console.warn('Cell lookup failed, using PDF coordinates:', e);
              // Still draw sector from PDF data as fallback
              const cid = parseInt(String(data.cid) || '0');
              const cellIndex = cid % 256;
              const inferredAzimuth = (cellIndex <= 2 ? cellIndex : (cid % 3)) * 120;
              const finalRange = exactRange || 300;
              if (exactAntennaLat && exactAntennaLng) {
                const sectorInfo = {
                  lat: exactAntennaLat,
                  lng: exactAntennaLng,
                  azimuth: inferredAzimuth,
                  range: finalRange,
                  widthDeg: 120,
                  azimuthSource: 'inferred-mod3',
                };
                setAntennaSector(sectorInfo);
                setModalData((prev: any) => ({ ...prev, antennaSector: sectorInfo, radius: finalRange }));
              }
            }
          }

          // The antenna location IS the reference point for the circle — device is inside
          if (exactAntennaLat && exactAntennaLng) {
            setDeviceCenter([exactAntennaLat, exactAntennaLng]);
          }

          setModalData((prev: any) => ({
            ...prev,
            phone: data.phone || '',
            folio: cleanPhone,
            company: data.company || '',
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
            radius: exactRange
          }));
          setShowTowers(true);
        } else {
          setModalData({ type: 'Sabana', excelData: result.data, excelCols: result.columns });
        }
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Error processing file:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveModal = async (data: any) => {
    if (data.type === 'GEO') {
      const phone = data.phone || 'S/N';
      const now = new Date();
      // Format: DD/MM/YYYY HH:MM — date when the GEO was requested
      const requestedDate = now.toLocaleDateString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
      });
      const newPoint = {
        id: Date.now(),
        lat: parseFloat(data.lat || modalData.lat || 19.4326),
        lng: parseFloat(data.lng || modalData.lng || -99.1332),
        antennaLat: modalData.antennaLat,
        antennaLng: modalData.antennaLng,
        lac: modalData.lac,
        cid: modalData.cid,
        // Store real PDF radius for the accuracy circle on the map
        radius: modalData.radius ? parseFloat(modalData.radius) : null,
        address: data.direccion || modalData.direccion || 'Dirección de búsqueda',
        date: requestedDate,
        timestamp: now.getTime(),
        antennaSector: modalData.antennaSector || null
      };

      setHistory(prev => ({ ...prev, [phone]: [newPoint, ...(prev[phone] || [])] }));
      setSelectedPhone(phone);
      setViewedPoint(null);
    } else if (data.type === 'Sabana' && modalData.excelData) {
      setExcelCols(modalData.excelCols);
      setExcelData(modalData.excelData);
    }

    await fetch('/api/intellectus/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    setIsModalOpen(false);
    setModalData({});
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="animate-in fade-in slide-in-from-left-4 duration-700">
          <h1 className="text-4xl font-black text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white via-slate-100 to-slate-400">
            Control Intellectus
          </h1>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden mb-2">
        <div className="lg:col-span-8 flex flex-col gap-8 overflow-hidden">
          <div className="relative group flex-1 min-h-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition-opacity duration-1000 pointer-events-none" />
            <Map
              markers={markers}
              towerMarkers={towerMarkers}
              showTowers={showTowers}
              center={center}
              zoom={viewedPoint ? 17 : 14}
              geoCompany={geoCompany}
              targetCenter={deviceCenter || center}
              towerRange={towerRange}
              cameraFlyTo={cameraFlyTo}
              antennaSector={!showAll ? antennaSector : null}
              extraMarkers={showAll ? allPointsMarkers : []}
            />
          </div>
          {excelData.length > 0 && (
            <div className="h-1/3 min-h-[200px] overflow-hidden glass rounded-3xl p-4">
              <DataTable columns={excelCols} data={excelData} />
            </div>
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6 overflow-hidden">
          <div className="glass p-6 rounded-[2rem] flex-[1.1] flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/5 transition-transform duration-500 hover:rotate-3"><Navigation size={20} /></div>
              <div>
                <h3 className="text-lg font-extrabold text-white tracking-tight uppercase">Dispositivos</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Recientes</p>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 no-scrollbar mb-4">
              {Object.keys(history).sort((a, b) => history[b][0].timestamp - history[a][0].timestamp).map(phone => (
                <button key={phone} onClick={() => { setSelectedPhone(phone); setViewedPoint(null); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-300 group ${selectedPhone === phone ? 'bg-indigo-600/10 border-indigo-500/40 shadow-lg shadow-indigo-500/5' : 'bg-slate-900/40 border-white/5 text-slate-400 hover:bg-slate-800'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${selectedPhone === phone ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40' : 'bg-slate-800 text-slate-600'}`}><PhoneCall size={10} /></div>
                    <span className={`text-[13px] tracking-tighter ${selectedPhone === phone ? 'font-black text-white' : 'font-bold'}`}>{phone}</span>
                  </div>
                  <div className={`w-1 h-1 rounded-full transition-all ${selectedPhone === phone ? 'bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,1)]' : 'bg-slate-800 opacity-0 group-hover:opacity-100'}`} />
                </button>
              ))}
            </div>
            <FileUpload onFileSelect={handleFileSelect} isLoading={isProcessing} />
          </div>

          <div className="glass p-6 rounded-[2rem] flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 shadow-lg shadow-cyan-500/5"><History size={20} /></div>
                <div>
                  <h3 className="text-lg font-extrabold text-white tracking-tight uppercase">Cronograma</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Geolocalización</p>
                </div>
              </div>
              {selectedPhone && (
                <div className="flex items-center gap-2">
                  {/* Count bubble */}
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-black text-white">{history[selectedPhone]?.length || 0}</span>
                  </div>
                  {/* Mode toggle */}
                  <div className="flex items-center bg-slate-900/60 border border-white/5 rounded-lg p-0.5">
                    <button
                      onClick={() => setShowAll(false)}
                      className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all ${!showAll ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                      Timeline
                    </button>
                    <button
                      onClick={() => { setShowAll(true); setViewedPoint(null); }}
                      className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all ${showAll ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                      Ver Todas
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
              {selectedPhone && history[selectedPhone]?.map((point, idx) => (
                <button
                  key={point.id}
                  onClick={() => {
                    setShowAll(false);
                    setViewedPoint([point.lat, point.lng]);
                    setDeviceCenter([point.lat, point.lng]);
                    setAntennaSector(point.antennaSector || null);
                  }}
                  className={`w-full text-left border p-4 rounded-2xl transition-all group flex items-start gap-4 shadow-inner ${!showAll && viewedPoint && viewedPoint[0] === point.lat
                    ? 'bg-indigo-600/10 border-indigo-500/30'
                    : showAll
                      ? 'bg-cyan-500/5 border-cyan-500/10 hover:border-cyan-500/30'
                      : 'bg-slate-900/40 border-white/5 hover:bg-slate-900/80 hover:border-white/10'
                    }`}
                >
                  {/* Timeline dot + connector */}
                  <div className="flex flex-col items-center gap-1 mt-1 shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full border-2 transition-all ${showAll ? 'bg-cyan-400 border-cyan-300/50 shadow-[0_0_8px_rgba(34,211,238,0.6)]'
                      : !showAll && viewedPoint && viewedPoint[0] === point.lat ? 'bg-indigo-400 border-white/30 shadow-[0_0_10px_rgba(129,140,248,0.8)]'
                        : 'bg-slate-700 border-white/5'
                      }`} />
                    {idx !== history[selectedPhone].length - 1 && <div className="w-px flex-1 min-h-[32px] bg-white/5" />}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Date/time */}
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                      <Clock size={9} className="opacity-60 shrink-0" />
                      <span className="text-[8px] font-extrabold uppercase tracking-[0.2em] truncate">
                        {point.date ? new Date(point.date).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : point.date}
                      </span>
                    </div>
                    {/* Address */}
                    <p className="text-[11px] font-bold text-white/90 leading-snug mb-2 truncate">{point.address}</p>
                    {/* Coords */}
                    <div className="flex items-center gap-1 text-[8px] text-slate-600 font-mono">
                      <span>{point.lat.toFixed(5)}</span>
                      <span className="text-slate-700">,</span>
                      <span>{point.lng.toFixed(5)}</span>
                    </div>
                  </div>
                  <ChevronRight size={12} className="text-slate-700 group-hover:text-indigo-400 transition-colors shrink-0 mt-2" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <ControlModal isOpen={isModalOpen} initialData={modalData} onClose={() => { setIsModalOpen(false); setModalData({}); }} onSave={handleSaveModal} />
    </>
  );
}

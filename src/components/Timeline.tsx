'use client';

import React, { useRef, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, SkipBack, SkipForward, Rewind, FastForward, PlayCircle } from 'lucide-react';

interface TimelinePoint {
  id: number;
  lat: number;
  lng: number;
  address: string;
  date: string;
  radius?: number | null;
  antennaSector?: any;
  fileId?: string | null;
}

interface TimelineProps {
  points: TimelinePoint[];
  activeIndex: number;
  onSelect: (index: number, point: TimelinePoint) => void;
  onViewPDF?: (fileId: string) => void;
  showAll: boolean;
  onToggleShowAll: (val: boolean) => void;
}

function parseDate(raw: string): { date: string; time: string; timestamp: number; hours: number } {
  if (!raw) return { date: '—', time: '', timestamp: 0, hours: 0 };
  let d = new Date(raw);
  // Manual parsing for custom formats like DD/MM/YYYY HH:mm
  if (isNaN(d.getTime())) {
    const m = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})[\s,]+(\d{1,2}):(\d{2})/);
    if (m) d = new Date(`${m[2]}/${m[1]}/${m[3]} ${m[4]}:${m[5]}`);
  }
  if (isNaN(d.getTime())) {
    const parts = raw.split(/[\s,]+/);
    return { date: parts[0] || raw, time: parts[1] || '', timestamp: 0, hours: 0 };
  }
  
  return {
    date: d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }),
    timestamp: d.getTime(),
    hours: d.getHours()
  };
}

export default function Timeline({ points, activeIndex, onSelect, showAll, onToggleShowAll }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse points to add timestamps for proportional positioning
  const validPoints = useMemo(() => {
     return points.map(p => {
       const pd = parseDate(p.date);
       return { ...p, pd };
     });
  }, [points]);

  const timestamps = validPoints.map(p => p.pd.timestamp).filter(t => t > 0);
  const minT = timestamps.length ? Math.min(...timestamps) : 0;
  const maxT = timestamps.length ? Math.max(...timestamps) : 0;
  const range = maxT - minT || 1; 

  const getPosition = (ts: number, index: number) => {
     if (ts === 0 || range === 1) {
         // Fallback linear layout if no valid timestamps or only one point
         return ((index + 1) / (points.length + 1)) * 100;
     }
     // 5% padding on each side to avoid markers at the extreme edges
     const unpaddedPercent = ((ts - minT) / range);
     return (unpaddedPercent * 90) + 5; 
  };

  const goTo = (idx: number) => {
      onToggleShowAll(false);
      onSelect(Math.max(0, Math.min(points.length - 1, idx)), points[idx]);
  };

  const active = validPoints[activeIndex];

  // Decorate grid with fake hours to look like the scrubber
  const decorativeTicks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  return (
    <div className="flex flex-col w-full h-full bg-[#09090b] overflow-visible relative font-sans border-t-2 border-white/5 shadow-inner">
       
        {/* Top half: Ticks and Markers Track */}
        <div ref={containerRef} className="flex-1 relative w-full overflow-visible bg-zinc-900/40">
            
            {/* Background Grid Ticks (Mimics timeline ruler) */}
            <div className="absolute inset-0 w-full h-full flex flex-col justify-end pb-3 opacity-30 select-none pointer-events-none">
                <div className="w-full flex items-end justify-between px-4 pb-1 border-b border-zinc-800">
                    {decorativeTicks.map(tick => (
                        <div key={tick} className="flex flex-col items-center gap-1">
                            <span className="text-[7px] font-mono text-zinc-500">|</span>
                            {/* Display alternating AM/PM generic tags to mimic screenshot */}
                            <span className="text-[7px] font-mono text-zinc-600">{tick % 20 === 0 ? '12:00 AM' : '6:00 PM'}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Middle Axis Line */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-zinc-800"></div>

            {/* Actual Data Points plotted on Axis */}
            {validPoints.map((pt, i) => {
               const pos = getPosition(pt.pd.timestamp, i);
               const isActive = !showAll && i === activeIndex;
               const isNeg = pt.lat === 0 && pt.lng === 0;
               
               return (
                  <div 
                    key={pt.id} 
                    className="absolute top-0 bottom-0 flex flex-col items-center justify-center cursor-pointer group hover:z-50 transition-all" 
                    style={{ left: `${pos}%`, transform: 'translateX(-50%)' }} 
                    onClick={() => goTo(i)}
                  >
                      {/* Active State Indicator line */}
                      {isActive && <div className={`absolute w-[2px] h-full z-0 ${isNeg ? 'bg-red-500 shadow-[0_0_12px_#ef4444]' : 'bg-blue-500 shadow-[0_0_12px_#3b82f6]'}`}></div>}
                      
                      {/* Interactive Marker Block mimicking screenshot thick rectangular sliders */}
                      <div className={`w-3.5 h-8 rounded-sm ${isActive ? (isNeg ? 'bg-red-500' : 'bg-blue-500') : (isNeg ? 'bg-red-900 group-hover:bg-red-700' : 'bg-zinc-600 group-hover:bg-zinc-400')} border border-[#09090b] shadow-md transition-colors z-10`} />
                      
                      {/* Tooltip / Label directly next to marker */}
                      <div className={`absolute -top-7 whitespace-nowrap z-20 px-2 py-0.5 rounded shadow-lg backdrop-blur-md transition-opacity pointer-events-none 
                                    ${isActive ? (isNeg ? 'opacity-100 bg-red-500/20 text-red-300 border border-red-500/50' : 'opacity-100 bg-blue-500/20 text-blue-300 border border-blue-500/50') : (isNeg ? 'opacity-0 group-hover:opacity-100 bg-red-950/80 text-red-300 border border-red-900/50' : 'opacity-0 group-hover:opacity-100 bg-zinc-800 text-zinc-300 border border-zinc-700')}`}>
                          <p className="text-[9px] font-mono font-bold leading-tight">{pt.pd.time}</p>
                          <p className="text-[7px] uppercase tracking-widest leading-tight opacity-70">{pt.pd.date}</p>
                      </div>
                  </div>
               );
            })}
        </div>

        {/* Bottom half: Controls & Status Bar (Exact screenshot replication) */}
        <div className="h-10 bg-zinc-200/5 flex items-center justify-between px-4 shrink-0 relative">
           
           {/* Active Point mini info (Left) */}
           <div className="flex items-center gap-3 w-[30%] truncate">
              {active && (
                 <div className="flex items-center gap-2">
                   <div className="px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/50 text-blue-400 text-[9px] font-black uppercase tracking-widest line-clamp-1">
                      MRZ {activeIndex + 1}/{points.length}
                   </div>
                   <div className="flex flex-col">
                       <span className="text-[9px] font-mono text-zinc-300">{active.pd.date} {active.pd.time}</span>
                       <span className={`text-[8px] truncate max-w-[150px] uppercase font-bold ${active.lat === 0 && active.lng === 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                           {active.lat === 0 && active.lng === 0 ? 'SIN UBICACIÓN (NEGATIVO)' : active.address}
                       </span>
                   </div>
                 </div>
              )}
           </div>

           {/* Media Controls mimicking video scrubber (Center) */}
           <div className="flex items-center gap-1 justify-center relative w-[40%] bg-zinc-950/80 px-4 py-1.5 rounded-full border border-white/5 shadow-xl -mt-4 z-50">
              <button className="p-1 rounded-full text-zinc-500 hover:text-zinc-300 transition-colors" title="Zoom To Fit" onClick={() => onToggleShowAll(true)}><Maximize2 size={12}/></button>
              <button disabled className="p-1 rounded-full text-zinc-600"><ZoomOut size={13}/></button>
              <button disabled className="p-1 rounded-full text-zinc-600"><ZoomIn size={13}/></button>
              
              <div className="w-px h-4 bg-zinc-800 mx-2"></div>
              
              <button onClick={() => goTo(activeIndex - 1)} disabled={activeIndex === 0} className="p-1.5 rounded-full text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"><SkipBack size={14}/></button>
              <button disabled className="p-1.5 rounded-full text-zinc-600"><Rewind size={14}/></button>
              
              {/* Play symbol to mimic screenshot */}
              <button onClick={() => goTo(activeIndex)} className="p-1 rounded-full text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 mx-1 transition-colors">
                 <PlayCircle size={18} />
              </button>
              
              <button disabled className="p-1.5 rounded-full text-zinc-600"><FastForward size={14}/></button>
              <button onClick={() => goTo(activeIndex + 1)} disabled={activeIndex === points.length - 1} className="p-1.5 rounded-full text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"><SkipForward size={14}/></button>
           </div>

           {/* Generic Scale/Watermark (Right) */}
           <div className="flex items-center justify-end gap-2 w-[30%] mt-1">
               <span className="text-[8px] font-mono text-zinc-600 tracking-widest">MAP INTERVAL: AUTO | DATOS DEL MAPA ©2026</span>
           </div>
        </div>
    </div>
  );
}

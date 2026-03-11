'use client';

import { useState, useEffect } from 'react';
import { Save, X, User, MapPin, Phone, Hash, Database, CheckCircle2, AlertCircle, ExternalLink, Activity, Loader2 } from 'lucide-react';

interface ControlEntry {
    numProg: number;
    date: string;
    author: string;
    company: string;
    type: 'GEO' | 'Sabana';
    area: string;
    result: 'Positivo' | 'Negativo';
    folio: string;
    creditsAvailable: number;
    creditsApplied: number;
    phone: string;
}

interface ControlModalProps {
    initialData?: Partial<ControlEntry>;
    knownProviders?: Record<string, string | null>;
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: ControlEntry) => void;
}

export default function ControlModal({ initialData = {}, knownProviders = {}, isOpen, onClose, onSave }: ControlModalProps) {
    const [formData, setFormData] = useState<ControlEntry>({
        numProg: 0,
        date: new Date().toLocaleString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false
        }),
        author: '',
        company: '',
        type: 'GEO',
        area: '',
        result: 'Negativo',
        folio: '',
        creditsAvailable: 0,
        creditsApplied: 1,
        phone: ''
    });

    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    // Helper to normalize phone numbers for lookup
    const normalizePhone = (p: string) => {
        const clean = (p || '').replace(/\D/g, '');
        if (clean.length > 10 && clean.startsWith('52')) return clean.substring(2);
        if (clean.length > 10 && clean.startsWith('044')) return clean.substring(3);
        return clean;
    };

    const [authors, setAuthors] = useState<string[]>([]);
    const [areas, setAreas] = useState<string[]>([]);
    const [companies, setCompanies] = useState<string[]>([]);

    useEffect(() => {
        if (typeof window !== 'undefined' && isOpen) {
            const savedAuthor = localStorage.getItem('intellectus_agent') || '';
            const savedArea = localStorage.getItem('intellectus_area') || '';
            const savedCredits = parseInt(localStorage.getItem('intellectus_credits') || '0');

            // Load unique lists for autocomplete
            const savedAuthors = JSON.parse(localStorage.getItem('intellectus_authors_list') || '[]');
            const savedAreas = JSON.parse(localStorage.getItem('intellectus_areas_list') || '[]');
            const savedCompanies = JSON.parse(localStorage.getItem('intellectus_companies_list') || '[]');
            setAuthors(savedAuthors);
            setAreas(savedAreas);
            setCompanies(savedCompanies);

            const phone = initialData.phone || '';
            const rawPhone = phone.replace(/\D/g, '');
            const cleanPhone = normalizePhone(rawPhone);
            const company = initialData.company || knownProviders[cleanPhone] || knownProviders[rawPhone] || knownProviders[phone] || '';

            setFormData(prev => ({
                ...prev,
                author: savedAuthor,
                area: savedArea,
                creditsAvailable: savedCredits,
                company: company,
                result: (initialData.result as any) || 'Negativo',
                folio: initialData.folio || '',
                date: initialData.date || prev.date, // Use report date if available
                type: (initialData.type as any) || 'GEO',
                phone: phone
            }));
        }
    }, [initialData, isOpen, knownProviders]);

    // Update company whenever phone changes manually
    useEffect(() => {
        const rawPhone = formData.phone.replace(/\D/g, '');
        const cleanPhone = normalizePhone(rawPhone);
        const known = knownProviders[cleanPhone] || knownProviders[rawPhone] || knownProviders[formData.phone];
        
        if (formData.phone && known && (!formData.company || formData.company === 'DESCONOCIDA' || formData.company === 'S/N')) {
            setFormData(prev => ({ ...prev, company: known || '' }));
        }
    }, [formData.phone, knownProviders]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);

        // Save current selection as default
        localStorage.setItem('intellectus_agent', formData.author);
        localStorage.setItem('intellectus_area', formData.area);
        localStorage.setItem('intellectus_credits', (formData.creditsAvailable - formData.creditsApplied).toString());

        // Update autocomplete lists
        if (formData.author) {
            const updatedAuthors = Array.from(new Set([...authors, formData.author])).sort();
            localStorage.setItem('intellectus_authors_list', JSON.stringify(updatedAuthors));
        }
        if (formData.area) {
            const updatedAreas = Array.from(new Set([...areas, formData.area])).sort();
            localStorage.setItem('intellectus_areas_list', JSON.stringify(updatedAreas));
        }
        if (formData.company) {
            const updatedCompanies = Array.from(new Set([...companies, formData.company])).sort();
            localStorage.setItem('intellectus_companies_list', JSON.stringify(updatedCompanies));
        }

        await onSave(formData);
        setIsSaving(false);
        onClose();
    };

    const openIFT = () => {
        // Strip non-digits and handle +52/52 prefix to get exactly 10 digits
        let cleanPhone = formData.phone.replace(/\D/g, '');
        if (cleanPhone.length > 10 && (cleanPhone.startsWith('52'))) {
            cleanPhone = cleanPhone.substring(2);
        }
        const tenDigits = cleanPhone.substring(0, 10);

        navigator.clipboard.writeText(tenDigits);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        window.open('https://sns.ift.org.mx:8081/sns-frontend/consulta-numeracion/numeracion-geografica.xhtml', '_blank');
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="glass w-full max-w-2xl rounded-[2.5rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">

                <div className="p-8 border-b border-white/5 bg-slate-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                            <Database size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Registro de Sabana / Geo</h2>
                            <p className="text-slate-500 text-sm font-medium uppercase tracking-[0.2em] mt-1">Confirmación de Control Mensual</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-2xl hover:bg-white/5 text-slate-500 hover:text-white transition-all"><X size={20} /></button>
                </div>

                <div className="p-8 overflow-y-auto max-h-[70vh] custom-scrollbar grid grid-cols-2 gap-6">

                    <div className="space-y-4">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Información General</label>
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-600 uppercase px-1">Núm. Progresivo</p>
                            <div className="bg-slate-900/50 border border-white/5 rounded-2xl py-3 px-4 text-sm text-slate-400 italic">
                                Cálculo Automático
                            </div>
                        </div>
                        <Input icon={Hash} label="Folio" value={formData.folio} onChange={(v: string) => setFormData({ ...formData, folio: v })} />
                        <Input
                            icon={User}
                            label="Realizó la consulta"
                            value={formData.author}
                            onChange={(v: string) => setFormData({ ...formData, author: v })}
                            list="authors-list"
                            options={authors}
                        />
                        <Input
                            icon={MapPin}
                            label="Área Solicitante"
                            value={formData.area}
                            onChange={(v: string) => setFormData({ ...formData, area: v })}
                            list="areas-list"
                            options={areas}
                        />
                        <Input icon={Phone} label="Teléfono" value={formData.phone} onChange={(v: string) => setFormData({ ...formData, phone: v })} />
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Detalles de Consulta</label>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <p className="text-[10px] font-bold text-slate-600 uppercase">Compañía</p>
                                <button onClick={openIFT} className="flex items-center gap-1.5 text-[9px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider">
                                    {copied ? '¡Copiado!' : 'Consultar en IFT'} <ExternalLink size={10} />
                                </button>
                            </div>
                            <Input
                                icon={Activity}
                                label=""
                                value={formData.company}
                                onChange={(v: string) => setFormData({ ...formData, company: v })}
                                list="companies-list"
                                options={companies}
                                placeholder="Ejem: TELCEL"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-600 uppercase px-1">Tipo</p>
                                <select className="w-full bg-slate-900 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
                                    <option value="GEO">Geolocalización</option>
                                    <option value="Sabana">Sábana</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-600 uppercase px-1">Créditos Disp.</p>
                                <input
                                    type="number"
                                    className="w-full bg-slate-900 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                    value={isNaN(formData.creditsAvailable) ? "" : formData.creditsAvailable}
                                    onChange={e => {
                                        const val = parseInt(e.target.value);
                                        setFormData({ ...formData, creditsAvailable: isNaN(val) ? 0 : val });
                                    }}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-600 uppercase px-1">Resultado</p>
                            <div className="flex gap-4">
                                <button onClick={() => setFormData({ ...formData, result: 'Positivo' })} className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2 border transition-all ${formData.result === 'Positivo' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-lg shadow-emerald-500/10' : 'bg-slate-900 text-slate-500 border-white/5'}`}>
                                    <CheckCircle2 size={16} /> Positivo
                                </button>
                                <button onClick={() => setFormData({ ...formData, result: 'Negativo' })} className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2 border transition-all ${formData.result === 'Negativo' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-lg shadow-rose-500/10' : 'bg-slate-900 text-slate-500 border-white/5'}`}>
                                    <AlertCircle size={16} /> Negativo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 border-t border-white/5 bg-slate-900/20 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 rounded-3xl text-sm font-bold text-slate-400 hover:bg-white/5 transition-all">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-3xl flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50">
                        {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        <span>Guardar Registro</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

function Input({ icon: Icon, label, value, onChange, type = "text", list, options, placeholder }: any) {
    return (
        <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-600 uppercase px-1">{label}</p>
            <div className="relative group">
                <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                <input
                    type={type}
                    list={list}
                    className="w-full bg-slate-900 border border-white/5 rounded-2xl py-3 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all font-sans uppercase"
                    value={value}
                    placeholder={placeholder}
                    onChange={e => onChange(e.target.value)}
                />
                {list && options && (
                    <datalist id={list}>
                        {options.map((opt: string) => (
                            <option key={opt} value={opt} />
                        ))}
                    </datalist>
                )}
            </div>
        </div>
    );
}

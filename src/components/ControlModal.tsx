'use client';

import { useState, useEffect } from 'react';
import { Save, X, User, MapPin, Phone, Hash, Database, CheckCircle2, AlertCircle, ExternalLink, Activity, Loader2, Clock, Lock, UserPlus } from 'lucide-react';
import UserRegistrationModal from './UserRegistrationModal';

interface ControlEntry {
    numProg: number;
    date: string;
    author: string;
    company: string;
    type: 'GEO' | 'Sabana';
    area: string;
    result: 'Positivo' | 'Negativo' | 'Pendiente';
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
    authorsList?: string[];
    areasList?: string[];
    companiesList?: string[];
}

export default function ControlModal({ 
    initialData = {}, 
    knownProviders = {}, 
    isOpen, 
    onClose, 
    onSave,
    authorsList = [],
    areasList = [],
    companiesList = []
}: ControlModalProps) {
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
        result: 'Pendiente',
        folio: '',
        creditsAvailable: 1000,
        creditsApplied: 0,
        phone: ''
    });

    // Default creditsApplied logic: AT&T for GEO = 2 credits, else 1. Sabanas = 1.
    useEffect(() => {
        const isATT = formData.company.toUpperCase().includes('AT&T') || formData.company.toUpperCase().includes('IUSACELL');
        
        if (formData.type === 'GEO') {
            const defaultCredits = isATT ? 2 : 1;
            // Only update if it was the previous default or zero (to avoid overwriting manual changes)
            setFormData(prev => ({ ...prev, creditsApplied: defaultCredits }));
        } else if (formData.type === 'Sabana') {
            setFormData(prev => ({ ...prev, creditsApplied: 1, result: 'Pendiente' }));
        }
    }, [formData.type, formData.company]);

    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [password, setPassword] = useState('');
    const [dbUsers, setDbUsers] = useState<any[]>([]);
    const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
    const [pendingAuthor, setPendingAuthor] = useState('');
    const [passwordError, setPasswordError] = useState('');

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
            const creditString = localStorage.getItem('intellectus_credits');
            
            setPassword('');
            setPasswordError('');
            fetch('/api/users')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setDbUsers(data);
                    }
                })
                .catch(err => console.error("Could not fetch users: ", err));
            
            // authorsList comes from localStorage, already ordered recent-first
            // We ensure we don't sort alphabetically anymore so recency is preserved.
                
            let savedCredits = 1000;
            if (creditString) {
                const parsed = parseInt(creditString);
                if (!isNaN(parsed) && parsed > 0) {
                    savedCredits = parsed;
                }
            }

            // Sync with props
            setAuthors(authorsList);
            setAreas(areasList);
            setCompanies(companiesList);

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
                result: (initialData.result as any) || (initialData.type === 'Sabana' ? 'Pendiente' : 'Negativo'),
                folio: initialData.folio || '',
                date: initialData.date || prev.date, 
                type: (initialData.type as any) || 'GEO',
                phone: initialData.phone || ''
            }));
        }
    }, [initialData, isOpen, knownProviders, authorsList, areasList, companiesList]);

    // Auto-sync Folio and Phone
    useEffect(() => {
        // If phone changes and folio is empty or was previous phone, update folio
        if (formData.phone && !formData.folio) {
            setFormData(prev => ({ ...prev, folio: prev.phone }));
        }
    }, [formData.phone]);

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

    const attemptSave = async () => {
        const currentAuthor = formData.author.toUpperCase().trim();
        if (!currentAuthor) {
            setPasswordError('Ingresa un autor primero.');
            return;
        }

        const isKnown = dbUsers.some(u => u.username === currentAuthor);

        if (!isKnown) {
            setPendingAuthor(currentAuthor);
            setIsRegistrationModalOpen(true);
            return;
        }

        if (!password) {
            setPasswordError('La contraseña es obligatoria.');
            return;
        }

        setPasswordError('');
        setIsSaving(true);

        try {
            const res = await fetch('/api/users/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentAuthor, password })
            });

            if (!res.ok) {
                const data = await res.json();
                setPasswordError(data.error || 'Contraseña incorrecta.');
                setIsSaving(false);
                return;
            }

            executeSave(currentAuthor);
        } catch (e) {
            setPasswordError('Error al verificar.');
            setIsSaving(false);
        }
    };

    const executeSave = async (verifiedAuthor: string) => {
        setIsSaving(true);

        // Convert everything to UPPERCASE before saving
        const finalData: ControlEntry = {
            ...formData,
            author: verifiedAuthor,
            company: formData.company.toUpperCase().trim(),
            area: formData.area.toUpperCase().trim(),
            folio: formData.folio.toUpperCase().trim(),
            phone: formData.phone.trim(), // Keep phone original but trimmed
            result: formData.result.toUpperCase() as any
        };

        // Save current selection as default (also in uppercase)
        localStorage.setItem('intellectus_agent', finalData.author);
        localStorage.setItem('intellectus_area', finalData.area);
        localStorage.setItem('intellectus_credits', (finalData.creditsAvailable - finalData.creditsApplied).toString());

        // Update autocomplete lists (UPPERCASE and Unique) - Insert latest at the beginning for recency
        if (finalData.author) {
            const updatedAuthors = Array.from(new Set([finalData.author, ...authors]));
            localStorage.setItem('intellectus_authors_list', JSON.stringify(updatedAuthors));
        }
        if (finalData.area) {
            const updatedAreas = Array.from(new Set([finalData.area, ...areas]));
            localStorage.setItem('intellectus_areas_list', JSON.stringify(updatedAreas));
        }
        if (finalData.company) {
            const updatedCompanies = Array.from(new Set([finalData.company, ...companies]));
            localStorage.setItem('intellectus_companies_list', JSON.stringify(updatedCompanies));
        }

        await onSave(finalData);
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
                        <Input 
                            icon={Phone} 
                            label="Teléfono / Folio" 
                            value={formData.phone} 
                            onChange={(v: string) => setFormData({ ...formData, phone: v, folio: v })} 
                        />
                        <AuthorAutocomplete
                            value={formData.author}
                            onChange={(v: string) => { setFormData({ ...formData, author: v }); setPasswordError(''); }}
                            options={Array.from(new Set([...authors, ...dbUsers.map(u => u.username)]))}
                            onAddNew={() => { setPendingAuthor(''); setIsRegistrationModalOpen(true); }}
                        />
                        <div className="space-y-1">
                            <Input
                                icon={Lock}
                                type="password"
                                label={
                                    !formData.author.trim() ? "Contraseña" :
                                    dbUsers.some(u => u.username === formData.author.toUpperCase().trim()) ? "Firma Autorizada" : "Nuevo Usuario"
                                }
                                value={password}
                                onChange={(v: string) => { setPassword(v); setPasswordError(''); }}
                                placeholder={
                                    !formData.author.trim() ? "..." :
                                    dbUsers.some(u => u.username === formData.author.toUpperCase().trim()) ? "Ingresa tu contraseña" : "Se pedirá crear contraseña al guardar"
                                }
                            />
                            {passwordError && (
                                <p className="text-xs font-bold text-rose-400 px-1 animate-in slide-in-from-top-1">{passwordError}</p>
                            )}
                        </div>
                        <Input
                            icon={MapPin}
                            label="Área Solicitante"
                            value={formData.area}
                            onChange={(v: string) => setFormData({ ...formData, area: v })}
                            list="areas-list"
                            options={areas}
                        />
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

                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-600 uppercase px-1">Tipo de Registro</p>
                            <select className="w-full bg-slate-900 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
                                <option value="GEO">Geolocalización (PDF)</option>
                                <option value="Sabana">Sábana (Excel)</option>
                            </select>
                        </div>


                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                <p className="text-[10px] font-bold text-indigo-400 uppercase px-1">
                                    Créditos Disponibles
                                </p>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500">
                                        <Database size={16} />
                                    </div>
                                    <input
                                        type="number"
                                        className="w-full bg-slate-900 border border-indigo-500/30 rounded-2xl py-3 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)] font-bold"
                                        value={formData.creditsAvailable === undefined ? "" : formData.creditsAvailable}
                                        onChange={e => {
                                            const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                                            setFormData({ ...formData, creditsAvailable: isNaN(val) ? 0 : val });
                                        }}
                                        placeholder="1000"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                <p className="text-[10px] font-bold text-indigo-400 uppercase px-1">
                                    {formData.type === 'GEO' ? 'Créditos por Consulta' : 'Créditos Usados'}
                                </p>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500">
                                        <Activity size={16} />
                                    </div>
                                    <input
                                        type="number"
                                        className="w-full bg-slate-900 border border-indigo-500/30 rounded-2xl py-3 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)] font-bold"
                                        value={!formData.creditsApplied || isNaN(formData.creditsApplied) ? "" : formData.creditsApplied}
                                        onChange={e => {
                                            const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                                            setFormData({ ...formData, creditsApplied: isNaN(val) ? 0 : val });
                                        }}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-600 uppercase px-1">Resultado de Búsqueda</p>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400">
                                    {formData.result === 'Positivo' && <CheckCircle2 size={16} className="text-emerald-400" />}
                                    {formData.result === 'Negativo' && <AlertCircle size={16} className="text-rose-400" />}
                                    {formData.result === 'Pendiente' && <Clock size={16} className="text-orange-400" />}
                                </div>
                                <select 
                                    className={`w-full bg-slate-900 border border-white/5 rounded-2xl py-3 pl-12 pr-6 text-sm font-bold appearance-none focus:outline-none focus:border-indigo-500/50 transition-all ${
                                        formData.result === 'Positivo' ? 'text-emerald-400' : 
                                        formData.result === 'Negativo' ? 'text-rose-400' : 'text-orange-400'
                                    }`}
                                    value={formData.result} 
                                    onChange={e => setFormData({ ...formData, result: e.target.value as any })}
                                >
                                    <option value="Pendiente" className="text-orange-400 bg-slate-900">PENDIENTE</option>
                                    <option value="Positivo" className="text-emerald-400 bg-slate-900">POSITIVO</option>
                                    <option value="Negativo" className="text-rose-400 bg-slate-900">NEGATIVO</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                                    <Activity size={12} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 border-t border-white/5 bg-slate-900/20 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 rounded-3xl text-sm font-bold text-slate-400 hover:bg-white/5 transition-all">Cancelar</button>
                    <button onClick={attemptSave} disabled={isSaving} className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-3xl flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50">
                        {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        <span>Guardar Registro</span>
                    </button>
                </div>
            </div>

            <UserRegistrationModal 
                isOpen={isRegistrationModalOpen}
                initialUsername={pendingAuthor}
                onClose={() => setIsRegistrationModalOpen(false)}
                onSuccess={(newUser, createdPwd) => {
                    setIsRegistrationModalOpen(false);
                    setDbUsers(prev => [...prev, newUser]);
                    setPassword(createdPwd);
                    setFormData(prev => ({ ...prev, author: newUser.username }));
                    // Execute save cleanly using the guaranteed verified author
                    executeSave(newUser.username);
                }}
            />
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
                    <datalist id={list} key={`${list}-${options.length}`}>
                        {options.map((opt: string) => (
                            <option key={opt} value={opt} />
                        ))}
                    </datalist>
                )}
            </div>
        </div>
    );
}

function AuthorAutocomplete({ value, onChange, options, onFocus, onBlur, onAddNew }: any) {
    const [focused, setFocused] = useState(false);
    
    const filtered = options.filter((o: string) => o.toLowerCase().includes(value.toLowerCase()));

    return (
        <div className="space-y-2 relative">
            <p className="text-[10px] font-bold text-slate-600 uppercase px-1">Realizó la consulta</p>
            <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                <input
                    className="w-full bg-slate-900 border border-white/5 rounded-2xl py-3 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all font-sans uppercase font-bold"
                    value={value}
                    placeholder="Busca o escribe un nombre"
                    onChange={e => onChange(e.target.value)}
                    onFocus={(e) => { setFocused(true); if(onFocus) onFocus(e); }}
                    onBlur={(e) => {
                        setTimeout(() => { setFocused(false); if(onBlur) onBlur(e); }, 150);
                    }}
                />
            </div>
            
            {focused && (
                <div className="absolute top-[100%] left-0 right-0 mt-2 z-50 bg-slate-800 border border-indigo-500/30 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="max-h-48 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {filtered.length > 0 ? filtered.map((opt: string, idx: number) => (
                            <button
                                key={idx}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { onChange(opt); setFocused(false); }}
                                className="w-full text-left px-4 py-2 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-indigo-500/30 rounded-xl transition-all uppercase flex items-center justify-between group/btn"
                            >
                                <span>{opt}</span>
                                {idx === 0 && <span className="text-[9px] text-indigo-400/50 group-hover/btn:text-indigo-300">Reciente</span>}
                            </button>
                        )) : (
                            <p className="text-[10px] text-slate-500 text-center py-4 font-bold uppercase tracking-widest">No hay resultados</p>
                        )}
                    </div>
                    <div className="p-2 border-t border-white/10 bg-slate-900/80">
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onAddNew(); setFocused(false); }} className="w-full py-3 bg-indigo-500/10 hover:bg-indigo-500/20 hover:scale-[0.98] text-indigo-400 hover:text-indigo-300 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-inner">
                            <UserPlus size={14} /> Crear Nuevo Agente
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

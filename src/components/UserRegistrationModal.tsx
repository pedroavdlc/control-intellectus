'use client';

import { useState } from 'react';
import { UserPlus, Shield, CheckCircle2, AlertCircle, User, Loader2, X, Lock } from 'lucide-react';

interface Props {
    isOpen: boolean;
    initialUsername?: string;
    onClose: () => void;
    onSuccess: (user: any, passwordUsed: string) => void;
}

export default function UserRegistrationModal({ isOpen, initialUsername = '', onClose, onSuccess }: Props) {
    const [username, setUsername] = useState(initialUsername || '');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleRegister = async () => {
        setError('');
        
        if (!username.trim() || !password) {
            setError('Todos los campos son obligatorios.');
            return;
        }

        if (password !== confirm) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'Error al crear usuario');
            }

            onSuccess(data, password); // pass password back so the parent form can use it immediately to save
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="glass w-full max-w-sm rounded-[2.5rem] border border-indigo-500/20 shadow-[0_0_150px_rgba(99,102,241,0.3)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-white/5 relative bg-slate-900/40">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-2xl hover:bg-white/5 text-slate-500 hover:text-white transition-all"><X size={20} /></button>
                    <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6 mx-auto">
                        <UserPlus size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-white text-center tracking-tight">Registro de Agente</h2>
                    <p className="text-slate-400 text-sm font-medium text-center mt-2">Crea tu cuenta segura para firmar tus consultas y registros.</p>
                </div>

                <div className="p-8 space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Usuario / Nombre</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400" size={16} />
                            <input
                                autoFocus={!initialUsername}
                                type="text"
                                className="w-full bg-slate-900 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-indigo-500/50 uppercase font-bold"
                                placeholder="Ejem: PEREZ"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Contraseña de Firma</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400" size={16} />
                            <input
                                autoFocus={!!initialUsername}
                                type="password"
                                className="w-full bg-slate-900 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                placeholder="Crea una contraseña segura"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Confirmar Contraseña</label>
                        <div className="relative group">
                            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400" size={16} />
                            <input
                                type="password"
                                className="w-full bg-slate-900 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                placeholder="Repite la contraseña"
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold p-4 rounded-2xl flex items-center gap-2 animate-in slide-in-from-top-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                </div>

                <div className="p-8 border-t border-white/5 bg-slate-900/40">
                    <button 
                        onClick={handleRegister} 
                        disabled={isLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(99,102,241,0.3)] active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                        <span>Registrar Cuenta</span>
                    </button>
                    <button onClick={onClose} className="w-full text-center text-xs font-bold text-slate-500 hover:text-white mt-4 transition-colors">Cancelar</button>
                </div>
            </div>
        </div>
    );
}

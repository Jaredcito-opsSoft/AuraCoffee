import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Mail, Sparkles, Delete } from 'lucide-react';
import { useAuthStore, UserRole } from '../../store/auth.store';
import { api } from '../../lib/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const [mode, setMode] = useState<'pin' | 'email'>('pin');
  const [pin, setPin] = useState<string>('');
  const [email, setEmail] = useState<string>('cajero1@brewdesk.local');
  const [password, setPassword] = useState<string>('123456');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        submitPin(nextPin);
      }
    }
  };

  const handlePinDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const submitPin = async (pinToSubmit: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ token: string; user: any }>('/auth/pin-login', {
        pin: pinToSubmit,
      });
      login(res.token, res.user);
      navigate(res.user.role === 'barista' ? '/kds' : '/pos');
    } catch (err: any) {
      setError(err.message || 'PIN inválido');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ token: string; user: any }>('/auth/login', {
        email,
        password,
      });
      login(res.token, res.user);
      navigate(res.user.role === 'barista' ? '/kds' : '/pos');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  // Quick switcher for demo and evaluation
  const loginQuickProfile = (role: UserRole, quickPin: string) => {
    setPin(quickPin);
    submitPin(quickPin);
  };

  return (
    <div className="min-h-screen w-screen bg-[#0F0C08] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-amber-700/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#18130C] border border-[#2E2419] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 items-center justify-center text-3xl shadow-lg shadow-amber-950/50 mb-3">
            ☕
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#FDF8F0] tracking-wide">
            BrewDesk
          </h1>
          <p className="text-xs text-amber-400 font-medium tracking-widest uppercase mt-0.5">
            Sistema de Gestión de Cafetería
          </p>
        </div>

        {/* Auth Mode Toggle Tabs */}
        <div className="grid grid-cols-2 p-1 bg-[#100C08] rounded-xl border border-[#2A2016] mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('pin');
              setError(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'pin'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <KeyRound size={14} />
            <span>PIN Rápido (POS)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('email');
              setError(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'email'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Mail size={14} />
            <span>Correo / Contraseña</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs text-center font-medium animate-shake">
            {error}
          </div>
        )}

        {/* PIN MODE */}
        {mode === 'pin' && (
          <div>
            {/* PIN Dots Display */}
            <div className="flex justify-center gap-4 mb-6">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    pin.length > index
                      ? 'bg-amber-400 border-amber-400 scale-110 shadow-md shadow-amber-500/50'
                      : 'border-stone-700 bg-stone-900/50'
                  }`}
                />
              ))}
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={loading}
                  onClick={() => handlePinDigit(digit)}
                  className="h-14 rounded-2xl bg-[#20180F] hover:bg-amber-500/20 active:scale-95 border border-[#34271A] text-xl font-bold text-stone-100 transition-all focus:outline-none"
                >
                  {digit}
                </button>
              ))}
              <div />
              <button
                type="button"
                disabled={loading}
                onClick={() => handlePinDigit('0')}
                className="h-14 rounded-2xl bg-[#20180F] hover:bg-amber-500/20 active:scale-95 border border-[#34271A] text-xl font-bold text-stone-100 transition-all focus:outline-none"
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinDelete}
                className="h-14 rounded-2xl bg-[#20180F] hover:bg-red-950/40 active:scale-95 border border-[#34271A] flex items-center justify-center text-stone-300 transition-all focus:outline-none"
              >
                <Delete size={20} />
              </button>
            </div>
          </div>
        )}

        {/* EMAIL MODE */}
        {mode === 'email' && (
          <form onSubmit={submitEmail} className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@brewdesk.local"
                className="w-full bg-[#100C08] border border-[#2E2419] rounded-xl px-4 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#100C08] border border-[#2E2419] rounded-xl px-4 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-950/50"
            >
              {loading ? 'Accediendo...' : 'Iniciar Sesión'}
            </button>
          </form>
        )}

        {/* Quick Demo Access Bar */}
        <div className="pt-4 border-t border-[#2A2016]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-stone-400 flex items-center gap-1 font-medium">
              <Sparkles size={12} className="text-amber-400" />
              Acceso Rápido de Prueba (Demo):
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => loginQuickProfile('cashier', '1111')}
              className="px-2.5 py-1.5 bg-[#20180F] hover:bg-amber-500/15 border border-[#34271A] rounded-lg text-left transition-colors"
            >
              <span className="font-semibold text-amber-300 block">Cajera (Ana)</span>
              <span className="text-[10px] text-stone-400 font-mono">PIN: 1111</span>
            </button>
            <button
              type="button"
              onClick={() => loginQuickProfile('barista', '3333')}
              className="px-2.5 py-1.5 bg-[#20180F] hover:bg-amber-500/15 border border-[#34271A] rounded-lg text-left transition-colors"
            >
              <span className="font-semibold text-sky-300 block">Barista (Mateo)</span>
              <span className="text-[10px] text-stone-400 font-mono">PIN: 3333</span>
            </button>
            <button
              type="button"
              onClick={() => loginQuickProfile('manager', '2222')}
              className="px-2.5 py-1.5 bg-[#20180F] hover:bg-amber-500/15 border border-[#34271A] rounded-lg text-left transition-colors"
            >
              <span className="font-semibold text-emerald-300 block">Gerente (Carlos)</span>
              <span className="text-[10px] text-stone-400 font-mono">PIN: 2222</span>
            </button>
            <button
              type="button"
              onClick={() => loginQuickProfile('admin', '1234')}
              className="px-2.5 py-1.5 bg-[#20180F] hover:bg-amber-500/15 border border-[#34271A] rounded-lg text-left transition-colors"
            >
              <span className="font-semibold text-amber-400 block">Admin (Sofía)</span>
              <span className="text-[10px] text-stone-400 font-mono">PIN: 1234</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

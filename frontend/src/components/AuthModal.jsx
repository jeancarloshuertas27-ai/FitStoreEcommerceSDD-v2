import React, { useState, useEffect } from 'react';
import { X, LogIn, UserPlus, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { useUser } from '../context/UserContext.jsx';

export default function AuthModal({
  isOpen,
  initialMode = 'login',
  reasonText = '',
  onClose,
  onSuccess,
}) {
  const { login, register } = useUser();
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    name: '',
    dni: '',
    email: '',
    phone: '',
    address: '',
    city: 'Lima',
    password: '',
  });

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode || 'login');
      setErrorMsg('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!loginForm.email.trim() || !loginForm.password) {
      setErrorMsg('Ingresa tu correo electrónico y contraseña.');
      return;
    }

    try {
      setLoading(true);
      const user = await login(loginForm.email.trim(), loginForm.password);
      onSuccess?.(user);
      onClose?.();
    } catch (err) {
      setErrorMsg(err.message || 'Correo electrónico o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!registerForm.name.trim()) {
      setErrorMsg('El nombre completo es obligatorio.');
      return;
    }
    if (!/^\d{8}$/.test(registerForm.dni.trim())) {
      setErrorMsg('El DNI debe contener exactamente 8 dígitos numéricos.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email.trim())) {
      setErrorMsg('Ingresa un correo electrónico válido.');
      return;
    }
    if (!/^\d{9}$/.test(registerForm.phone.trim())) {
      setErrorMsg('El número de celular debe contener exactamente 9 dígitos numéricos.');
      return;
    }
    if (!registerForm.address.trim()) {
      setErrorMsg('La dirección de entrega es obligatoria.');
      return;
    }
    if (!registerForm.password || registerForm.password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      const user = await register({
        ...registerForm,
        name: registerForm.name.trim(),
        dni: registerForm.dni.trim(),
        email: registerForm.email.trim(),
        phone: registerForm.phone.trim(),
        address: registerForm.address.trim(),
      });
      onSuccess?.(user);
      onClose?.();
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo completar tu registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative my-auto space-y-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <div className="w-10 h-10 rounded-2xl bg-orange-600/20 text-orange-400 border border-orange-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">
              {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta FitStore Pro'}
            </h2>
            <p className="text-[11px] text-slate-400">
              {reasonText || 'Accede con tu cuenta o regístrate en segundos para gestionar tus pedidos.'}
            </p>
          </div>
        </div>

        {/* Selector Login / Crear Cuenta */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'login'
                ? 'bg-orange-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Iniciar Sesión</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'register'
                ? 'bg-orange-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Crear Cuenta</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Correo Electrónico *</label>
              <input
                type="email"
                required
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="tucorreo@ejemplo.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Contraseña *</label>
              <input
                type="password"
                required
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              <span>{loading ? 'Ingresando...' : 'Ingresar a Mi Cuenta'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Nombre Completo *</label>
              <input
                type="text"
                required
                value={registerForm.name}
                onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                placeholder="Ej. María Fernanda Quispe"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">DNI (8 dígitos) *</label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  value={registerForm.dni}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, dni: e.target.value.replace(/\D/g, '') })
                  }
                  placeholder="72458912"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Celular (9 dígitos) *</label>
                <input
                  type="text"
                  required
                  maxLength={9}
                  value={registerForm.phone}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, phone: e.target.value.replace(/\D/g, '') })
                  }
                  placeholder="987654321"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Correo Electrónico *</label>
              <input
                type="email"
                required
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                placeholder="maria@ejemplo.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Dirección de Entrega *</label>
              <input
                type="text"
                required
                value={registerForm.address}
                onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                placeholder="Av. Javier Prado 1240, San Isidro"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Contraseña (mín. 6 caracteres) *</label>
              <input
                type="password"
                required
                minLength={6}
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              <span>{loading ? 'Creando Cuenta...' : 'Registrarme y Continuar'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

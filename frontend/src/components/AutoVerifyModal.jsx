import React, { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

/**
 * Modal animado de verificación automática de pagos (estilo Temu / Shein).
 * Ejecuta `verifyFn()` en paralelo con una línea de tiempo visual de fases
 * para Yape/Plin (2.5s), Transferencia BCP/CCI (2.5s) y Tarjeta (1.5s).
 */
export default function AutoVerifyModal({
  isOpen,
  method = 'yape_plin',
  ownerName,
  onSuccess,
  onError,
  verifyFn,
}) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const verifyFnRef = useRef(verifyFn);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  verifyFnRef.current = verifyFn;
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const isCard = method === 'credit_card';
  const isBank = method === 'bank_transfer';

  const phases = isCard
    ? [
        '🔐 Procesando tokenización 3D Secure...',
        '✅ Cobro autorizado correctamente.',
      ]
    : [
        isBank
          ? '🔄 Conectando con pasarela interbancaria CIP...'
          : '🔄 Conectando con cámara de compensación Yape / Plin...',
        isBank
          ? '🔍 Validando operación bancaria y conciliando pago...'
          : '🔍 Validando número celular y código de aprobación OTP...',
        '✅ ¡Pago verificado automáticamente! Orden aprobada.',
      ];

  useEffect(() => {
    if (!isOpen) {
      setPhaseIndex(0);
      setStatus('verifying');
      setErrorMsg('');
      return;
    }

    let cancelled = false;
    const timers = [];

    setPhaseIndex(0);
    setStatus('verifying');
    setErrorMsg('');

    const delay = (ms) =>
      new Promise((resolve) => {
        const id = setTimeout(resolve, ms);
        timers.push(id);
      });

    // Defer 0ms para evitar doble ejecución bajo React.StrictMode
    const startTimer = setTimeout(async () => {
      if (cancelled) return;

      try {
        const verifyPromise = Promise.resolve().then(() => {
          if (typeof verifyFnRef.current !== 'function') {
            throw new Error('Función de verificación no disponible');
          }
          return verifyFnRef.current();
        });

        if (isCard) {
          // Tarjeta: 1500ms total en 2 fases (0-800ms fase 1, 800-1500ms fase 2)
          const [result] = await Promise.all([verifyPromise, delay(800)]);
          if (cancelled) return;

          setPhaseIndex(1);
          setStatus('success');

          await delay(700);
          if (cancelled) return;

          onSuccessRef.current?.(result);
        } else if (isBank) {
          // Transferencia bancaria CIP/CCI: 1800ms (< 2.0s) en 3 fases
          const phase2Timer = setTimeout(() => {
            if (!cancelled) setPhaseIndex(1);
          }, 550);
          timers.push(phase2Timer);

          const [result] = await Promise.all([verifyPromise, delay(1200)]);
          if (cancelled) return;

          setPhaseIndex(2);
          setStatus('success');

          await delay(600);
          if (cancelled) return;

          onSuccessRef.current?.(result);
        } else {
          // Yape/Plin: 2500ms total en 3 fases (0-800ms, 800-1800ms, 1800-2500ms)
          const phase2Timer = setTimeout(() => {
            if (!cancelled) setPhaseIndex(1);
          }, 800);
          timers.push(phase2Timer);

          const [result] = await Promise.all([verifyPromise, delay(1800)]);
          if (cancelled) return;

          setPhaseIndex(2);
          setStatus('success');

          await delay(700);
          if (cancelled) return;

          onSuccessRef.current?.(result);
        }
      } catch (err) {
        if (cancelled) return;
        timers.forEach((id) => clearTimeout(id));
        const message = err?.message || 'No se pudo verificar el pago automáticamente.';
        setErrorMsg(message);
        setStatus('error');
      }
    }, 0);

    timers.push(startTimer);

    return () => {
      cancelled = true;
      timers.forEach((id) => clearTimeout(id));
    };
  }, [isOpen, isCard, isBank, method]);

  if (!isOpen) return null;

  const handleRetry = () => {
    onErrorRef.current?.(errorMsg || 'No se pudo verificar el pago.');
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center space-y-6">
        {/* Encabezado de Seguridad */}
        <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Motor de Verificación FitStore Pro</span>
        </div>

        {/* Icono Principal Animado */}
        {status === 'verifying' && (
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-orange-500/20 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-slate-950 border-2 border-orange-500/50 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all">
            <CheckCircle2 className="w-11 h-11 text-emerald-400" />
          </div>
        )}

        {status === 'error' && (
          <div className="w-20 h-20 mx-auto rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/25">
            <AlertCircle className="w-11 h-11 text-rose-400" />
          </div>
        )}

        {/* Contenido según Estado */}
        {status !== 'error' ? (
          <div className="space-y-4">
            <h3
              className={`text-base font-black transition-colors duration-300 ${
                status === 'success' ? 'text-emerald-400' : 'text-white'
              }`}
            >
              {status === 'success' ? '¡Verificación Completada!' : 'Validando Pago en Tiempo Real'}
            </h3>

            <p
              className={`text-xs leading-relaxed min-h-[2.75rem] flex items-center justify-center px-2 transition-all duration-300 ${
                status === 'success' ? 'text-emerald-300 font-semibold' : 'text-slate-300'
              }`}
            >
              {phases[phaseIndex]}
            </p>

            {/* Indicador de Progreso por Fases */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-center gap-2">
                {phases.map((_, idx) => {
                  const isDone = idx < phaseIndex || status === 'success';
                  const isCurrent = idx === phaseIndex && status === 'verifying';
                  return (
                    <span
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        isDone
                          ? 'w-8 bg-emerald-400'
                          : isCurrent
                          ? 'w-8 bg-orange-400 animate-pulse'
                          : 'w-4 bg-slate-700'
                      }`}
                    />
                  );
                })}
              </div>
              <span className="block text-[10px] text-slate-400 font-mono">
                Paso {Math.min(phaseIndex + 1, phases.length)} de {phases.length}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-base font-black text-rose-400">
              No se pudo verificar el pago
            </h3>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs leading-relaxed text-left flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>

            <button
              type="button"
              onClick={handleRetry}
              className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

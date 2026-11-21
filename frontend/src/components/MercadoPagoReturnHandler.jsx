import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, Clock, X } from 'lucide-react';
import api from '../services/api.js';
import { useCart } from '../context/CartContext.jsx';
import ElectronicReceipt from './ElectronicReceipt.jsx';

/**
 * Procesa el retorno de Mercado Pago Checkout Pro (back_urls):
 * lee payment_id / status de la URL, verifica el pago contra el backend
 * (que a su vez consulta la API de Mercado Pago) y muestra la Boleta Electrónica.
 */
export default function MercadoPagoReturnHandler({ onOrderCompleted }) {
  const { clearCart } = useCart();
  const [state, setState] = useState({ phase: 'idle', order: null, message: '' });
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has('mp_return')) return;
    startedRef.current = true;

    const paymentId = params.get('payment_id') || params.get('collection_id');
    const status = params.get('status') || params.get('collection_status');

    const cleanUrl = () => window.history.replaceState({}, '', window.location.pathname + window.location.hash);

    if (!paymentId || paymentId === 'null') {
      cleanUrl();
      setState({
        phase: 'error',
        order: null,
        message: 'Cancelaste el pago en Mercado Pago. No se realizó ningún cobro y tu carrito sigue intacto.',
      });
      return;
    }

    setState({ phase: 'verifying', order: null, message: '' });
    api
      .verifyMercadoPago(paymentId)
      .then((res) => {
        cleanUrl();
        if (!res.success) {
          setState({ phase: res.pending ? 'pending' : 'error', order: null, message: res.message || '' });
          return;
        }
        clearCart();
        const order = { ...(res.order || {}), payment: res.payment || res.order?.payment || {} };
        setState({ phase: 'done', order, message: '' });
        if (onOrderCompleted) onOrderCompleted(order);
      })
      .catch((err) => {
        cleanUrl();
        const pending = err?.status === 202 || err?.data?.pending || status === 'pending' || status === 'in_process';
        setState({
          phase: pending ? 'pending' : 'error',
          order: null,
          message: err?.message || 'No se pudo verificar tu pago con Mercado Pago.',
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.phase === 'idle') return null;

  if (state.phase === 'done' && state.order) {
    return (
      <ElectronicReceipt
        order={state.order}
        onClose={() => setState({ phase: 'idle', order: null, message: '' })}
        onContinueShopping={() => setState({ phase: 'idle', order: null, message: '' })}
        onGoToOrders={() => {
          setState({ phase: 'idle', order: null, message: '' });
          window.location.hash = '#profile';
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-8 text-center space-y-4 relative">
        {state.phase !== 'verifying' && (
          <button
            onClick={() => setState({ phase: 'idle', order: null, message: '' })}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {state.phase === 'verifying' && (
          <>
            <Loader2 className="w-10 h-10 text-sky-400 animate-spin mx-auto" />
            <h3 className="text-white font-black text-lg">Verificando tu pago con Mercado Pago…</h3>
            <p className="text-xs text-slate-400">Confirmando la transacción de forma segura.</p>
          </>
        )}
        {state.phase === 'pending' && (
          <>
            <Clock className="w-10 h-10 text-amber-400 mx-auto" />
            <h3 className="text-white font-black text-lg">Pago en verificación</h3>
            <p className="text-xs text-slate-300">{state.message}</p>
          </>
        )}
        {state.phase === 'error' && (
          <>
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h3 className="text-white font-black text-lg">Pago no completado</h3>
            <p className="text-xs text-slate-300">{state.message}</p>
          </>
        )}
      </div>
    </div>
  );
}

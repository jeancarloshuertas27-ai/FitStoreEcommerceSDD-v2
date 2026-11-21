import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Printer,
  ShoppingBag,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  Building2,
  Calendar,
  User,
  MapPin,
  CreditCard,
  QrCode,
  ArrowRight,
  Eye,
  X,
  Zap,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import api from '../services/api.js';
import AutoVerifyModal from './AutoVerifyModal.jsx';
import { generateRandomOperationNumber } from '../utils/voucherGenerator.js';

function computeRemainingSeconds(createdAt) {
  if (!createdAt) return 24 * 60 * 60;
  const raw = String(createdAt).trim();
  // SQLite CURRENT_TIMESTAMP usa "YYYY-MM-DD HH:MM:SS" en UTC
  const isoString = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(raw)
    ? raw.replace(' ', 'T') + 'Z'
    : raw;
  const createdMs = Date.parse(isoString);
  if (Number.isNaN(createdMs)) return 24 * 60 * 60;
  const expiresMs = createdMs + 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
}

function formatCipCountdown(totalSeconds) {
  const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const secs = String(totalSeconds % 60).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

export default function ElectronicReceipt({
  order,
  storeSettings,
  onClose,
  onGoToOrders,
  onContinueShopping,
  onOrderUpdated,
}) {
  const [currentOrder, setCurrentOrder] = useState(order);
  const [cipOpNumber, setCipOpNumber] = useState('');
  const [cipVerifyOpen, setCipVerifyOpen] = useState(false);
  const [cipVerifyError, setCipVerifyError] = useState('');
  const [copiedCip, setCopiedCip] = useState(false);
  const [cipSecondsLeft, setCipSecondsLeft] = useState(() =>
    computeRemainingSeconds(order?.payment?.created_at || order?.created_at)
  );

  useEffect(() => {
    setCurrentOrder(order);
    setCipOpNumber('');
    setCipVerifyOpen(false);
    setCipVerifyError('');
    setCipSecondsLeft(
      computeRemainingSeconds(order?.payment?.created_at || order?.created_at)
    );
  }, [order]);

  const activeOrder = currentOrder || order;
  const activePayment = activeOrder?.payment || {};
  const isPendingCip =
    activePayment.payment_status === 'Pendiente (CIP 24h)' &&
    activeOrder?.order_status !== 'Expirado' &&
    activeOrder?.order_status !== 'Cancelado';

  useEffect(() => {
    if (!isPendingCip) return;
    const interval = setInterval(() => {
      setCipSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPendingCip]);

  if (!activeOrder) return null;

  const total = Number(activeOrder.total || 0).toFixed(2);
  const shippingCost = Number(activeOrder.shipping_cost || 0);
  const items = activeOrder.items || [];
  const payment = activePayment;
  const isCardApproved = payment.payment_status === 'Aprobado';
  const isAutoVerified = /^(YAPE-AUTO-|CIP-AUTO-|AUTH-)/.test(payment.auth_code || '');
  const isExpired =
    activeOrder.order_status === 'Expirado' || payment.payment_status === 'Expirado';
  const showSuccessBanner = isCardApproved || isAutoVerified;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCip = () => {
    if (!payment.auth_code) return;
    navigator.clipboard?.writeText(payment.auth_code);
    setCopiedCip(true);
    setTimeout(() => setCopiedCip(false), 2000);
  };

  const handleTriggerCipVerify = () => {
    setCipVerifyError('');
    if (!cipOpNumber.trim()) {
      setCipVerifyError('Ingresa o genera el Número de Operación bancaria para verificar tu abono.');
      return;
    }
    setCipVerifyOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto">
        {/* Banner Superior de Estado */}
        <div
          className={`p-6 text-center text-white relative ${
            isExpired
              ? 'bg-gradient-to-r from-slate-700 via-slate-800 to-rose-900'
              : showSuccessBanner
              ? 'bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800'
              : 'bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700'
          }`}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all"
            title="Cerrar comprobante"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mx-auto flex items-center justify-center mb-3 shadow-lg">
            {showSuccessBanner ? (
              <CheckCircle2 className="w-10 h-10 text-white" />
            ) : (
              <Clock className="w-10 h-10 text-white animate-pulse" />
            )}
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-black/25 mb-1">
            {isExpired ? (
              'Reserva CIP Expirada'
            ) : isAutoVerified ? (
              <>
                <Zap className="w-3.5 h-3.5 text-emerald-300" />
                ✓ Verificado Automáticamente
              </>
            ) : showSuccessBanner ? (
              'Pago Aprobado y Liquidado'
            ) : isPendingCip ? (
              'Reserva CIP Activa (Vigencia 24h)'
            ) : (
              'Pago Registrado - En Verificación'
            )}
          </span>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            {isExpired
              ? 'Plazo CIP Vencido'
              : showSuccessBanner
              ? '¡Compra Exitosa en FitStore Pro!'
              : isPendingCip
              ? '¡Reserva CIP Registrada!'
              : '¡Pedido Registrado con Éxito!'}
          </h2>
          <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-md mx-auto">
            {isExpired
              ? 'Transcurrieron más de 24 horas sin verificación; el stock fue liberado automáticamente.'
              : isAutoVerified
              ? `Tu pago vía ${payment.method || 'pasarela digital'} fue verificado en tiempo real por FitStore Pro.`
              : showSuccessBanner
              ? 'Tu pago fue autorizado correctamente en FitStore Pro.'
              : isPendingCip
              ? `Tienes ${formatCipCountdown(cipSecondsLeft)} para completar y verificar tu abono con el código ${payment.auth_code}.`
              : 'Hemos recibido tu orden. En breve nuestro equipo validará tu comprobante para el despacho.'}
          </p>
        </div>

        {/* Cuerpo de la Boleta Electrónica */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto print:max-h-none print:overflow-visible">
          {/* Cabecera Formal de la Boleta */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-800 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-white tracking-wider">FITSTORE PRO</span>
                <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-bold">
                  PERÚ
                </span>
              </div>
              <p className="text-[11px] text-slate-400">RUC: 20608945123 • Nutrición Deportiva & Gimnasio</p>
              <p className="text-[11px] text-slate-500">Lima, Perú • Despachos a nivel nacional</p>
            </div>

            <div className="bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 text-right w-full sm:w-auto">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                Boleta de Venta Electrónica
              </span>
              <span className="text-base font-black font-mono text-orange-400">
                {activeOrder.order_code}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {activeOrder.created_at || new Date().toLocaleString('es-PE')}
              </span>
            </div>
          </div>

          {/* Datos del Cliente y Envío */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Cliente:</span>
              <strong className="text-white text-sm">{activeOrder.customer_name}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">DNI del Titular:</span>
              <strong className="text-white font-mono">{activeOrder.customer_dni}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Celular de Contacto:</span>
              <strong className="text-white font-mono">{activeOrder.customer_phone}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Dirección de Entrega:</span>
              <strong className="text-slate-200">{activeOrder.shipping_address}</strong>
            </div>
          </div>

          {/* Desglose de Productos Comprados */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-orange-400" />
              Detalle de Suplementos Adquiridos
            </h3>
            <div className="border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Cant.</th>
                    <th className="py-2.5 px-3">Producto</th>
                    <th className="py-2.5 px-3 text-right">P. Unit</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono font-bold text-orange-400">
                        {item.quantity}x
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-200">
                        {item.product_name}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        S/ {Number(item.unit_price).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        S/ {Number(item.subtotal || item.unit_price * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen Monetario */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal Productos:</span>
              <span className="font-mono text-slate-300">S/ {(Number(total) - shippingCost).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>
                Costo de Envío
                {activeOrder.shipping_province ? ` (${activeOrder.shipping_province})` : ''}:
              </span>
              {shippingCost > 0 ? (
                <span className="font-mono text-slate-300 font-bold">S/ {shippingCost.toFixed(2)}</span>
              ) : (
                <span className="font-mono text-emerald-400 font-bold">¡Envío Gratis!</span>
              )}
            </div>
            <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-sm">
              <span className="font-bold text-white">Total Liquidado en Soles:</span>
              <span className="text-xl font-black text-orange-400 font-mono">
                S/ {total}
              </span>
            </div>
          </div>

          {/* Información de Pago Autorizado */}
          <div className="p-4 rounded-2xl bg-orange-950/20 border border-orange-500/30 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-orange-400 font-bold text-xs uppercase tracking-wide">
                <ShieldCheck className="w-4 h-4" />
                Resumen de Pago Autorizado
              </div>
              {isAutoVerified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  <Zap className="w-3 h-3" />
                  ✓ Verificado Automáticamente
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block">Método de Pago:</span>
                <strong className="text-white">{payment.method || 'Yape'}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">
                  {payment.auth_code ? 'Hash / Código de Autorización:' : 'N° de Operación:'}
                </span>
                <strong className="text-emerald-400 font-mono">
                  {payment.auth_code || payment.operation_number || 'OP-CONFIRMADO'}
                </strong>
              </div>
              {payment.operation_number && payment.auth_code && (
                <div className="sm:col-span-2">
                  <span className="text-slate-400 text-[11px] block">Operación / OTP Registrado:</span>
                  <strong className="text-slate-200 font-mono text-xs">
                    {payment.operation_number}
                  </strong>
                </div>
              )}
              <div className="sm:col-span-2">
                <span className="text-slate-400 text-[11px] block">Estado de Verificación:</span>
                <strong className="text-emerald-300 font-mono text-xs">
                  {payment.payment_status || 'Procesado'} • Pasarela FitStore Pro
                </strong>
              </div>
            </div>

            {isAutoVerified && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ✓ Verificado Automáticamente
                </span>
                <span className="font-mono text-xs text-emerald-300 font-bold">
                  {payment.auth_code}
                </span>
              </div>
            )}

            {/* Bloque Interactivo de Reserva CIP Pendiente (24h) */}
            {isPendingCip && (
              <div className="mt-2 p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-amber-300 text-xs font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    ⏳ Transferencia CIP pendiente (24h)
                  </span>
                  <span className="font-mono text-xs font-black text-amber-200 bg-slate-950 px-2.5 py-1 rounded-lg border border-amber-500/30">
                    Expira en {formatCipCountdown(cipSecondsLeft)}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-amber-500/30">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block">Código CIP asignado:</span>
                    <span className="font-mono font-black text-sm text-amber-300">{payment.auth_code}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCip}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                  >
                    {copiedCip ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCip ? '¡Copiado!' : 'Copiar CIP'}</span>
                  </button>
                </div>

                {cipVerifyError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{cipVerifyError}</span>
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-semibold text-slate-300">
                      ¿Ya realizaste la transferencia? Ingresa el N° de operación:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCipOpNumber(generateRandomOperationNumber('BCP'));
                        setCipVerifyError('');
                      }}
                      className="text-[11px] text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Generar N° Demo
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={cipOpNumber}
                      onChange={(e) => setCipOpNumber(e.target.value)}
                      placeholder="Ej. BCP-829401"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleTriggerCipVerify}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verificar Abono Bancario</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Vista previa miniatura del voucher si existe */}
            {payment.voucher_image && (
              <div className="mt-3 pt-3 border-t border-orange-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={payment.voucher_image}
                    alt="Voucher adjunto"
                    className="w-12 h-16 object-cover rounded-lg border border-slate-700 shadow"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">Comprobante de Pago Adjunto</span>
                    <span className="text-[10px] text-slate-400">Adjuntado al comprobante de compra</span>
                  </div>
                </div>
                <a
                  href={payment.voucher_image}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver Voucher
                </a>
              </div>
            )}
          </div>

          {/* Acciones de la Boleta */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={handlePrint}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
              >
                <Printer className="w-4 h-4" />
                Imprimir Boleta
              </button>

              <button
                onClick={onGoToOrders}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
              >
                <Calendar className="w-4 h-4 text-orange-400" />
                Ver Mis Pedidos
              </button>

              <button
                onClick={onContinueShopping}
                className="py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 transition-all"
              >
                <span>Seguir Comprando</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Animado para verificar reservas CIP pendientes desde la boleta */}
      <AutoVerifyModal
        isOpen={cipVerifyOpen}
        method="bank_transfer"
        verifyFn={() =>
          api.autoVerifyPayment({
            method: 'bank_transfer',
            action: 'verify',
            order_id: activeOrder.id,
            cip_reference: payment.auth_code,
            cip_code: payment.auth_code,
            operation_number: cipOpNumber.trim(),
            total: activeOrder.total,
          })
        }
        onSuccess={(result) => {
          setCipVerifyOpen(false);
          const updated = {
            ...(result?.order || activeOrder),
            items: result?.order?.items || result?.items || items,
            payment: result?.order?.payment || result?.payment || activePayment,
          };
          setCurrentOrder(updated);
          onOrderUpdated?.(updated);
        }}
        onError={(msg) => {
          setCipVerifyOpen(false);
          setCipVerifyError(msg);
          if (msg && msg.toLowerCase().includes('expirad')) {
            const expiredOrder = {
              ...activeOrder,
              order_status: 'Expirado',
              payment: { ...payment, payment_status: 'Expirado' },
            };
            setCurrentOrder(expiredOrder);
            onOrderUpdated?.(expiredOrder);
          }
        }}
      />
    </div>
  );
}


import React from 'react';
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
} from 'lucide-react';

export default function ElectronicReceipt({
  order,
  storeSettings,
  onClose,
  onGoToOrders,
  onContinueShopping,
}) {
  if (!order) return null;

  const total = Number(order.total || 0).toFixed(2);
  const items = order.items || [];
  const payment = order.payment || {};
  const isCardApproved = payment.payment_status === 'Aprobado';
  const whatsappNumber = storeSettings?.whatsapp_notification || '983064501';

  // Construir mensaje de WhatsApp codificado
  const buildWhatsAppUrl = () => {
    const itemsSummary = items
      .map((it) => `• ${it.quantity}x ${it.product_name} (S/ ${Number(it.subtotal || it.unit_price * it.quantity).toFixed(2)})`)
      .join('\n');

    const opDetail = payment.auth_code
      ? `Código de Autorización: ${payment.auth_code}`
      : `N° de Operación: ${payment.operation_number || 'N/A'}`;

    const text = `¡Hola FitStore Pro! 🏋️‍♂️ Acabo de realizar una compra en la tienda web:

*Pedido:* ${order.order_code}
*Cliente:* ${order.customer_name}
*DNI:* ${order.customer_dni}
*Celular:* ${order.customer_phone}
*Dirección de Entrega:* ${order.shipping_address}

*Detalle de Productos:*
${itemsSummary}

*Total Pagado:* S/ ${total}
*Método de Pago:* ${payment.method || 'Yape'}
*Cuenta Destino:* ${payment.destination_account || 'Cuenta del Titular'}
*${opDetail}*
*Estado:* ${order.order_status}

Adjunto mi comprobante para la validación inmediata y despacho. ¡Muchas gracias!`;

    return `https://wa.me/51${whatsappNumber}?text=${encodeURIComponent(text)}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto">
        {/* Banner Superior de Estado */}
        <div
          className={`p-6 text-center text-white relative ${
            isCardApproved
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
            {isCardApproved ? (
              <CheckCircle2 className="w-10 h-10 text-white" />
            ) : (
              <Clock className="w-10 h-10 text-white animate-pulse" />
            )}
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-black/25 mb-1">
            {isCardApproved ? 'Pago Aprobado y Liquidado' : 'Pago Registrado - En Verificación'}
          </span>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            {isCardApproved ? '¡Compra Exitosa en FitStore Pro!' : '¡Pedido Registrado con Éxito!'}
          </h2>
          <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-md mx-auto">
            {isCardApproved
              ? 'Tu pago con tarjeta fue autorizado y liquidado en la cuenta recaudadora del negocio.'
              : 'Hemos recibido tu orden y comprobante. En breve nuestro equipo validará el voucher para el despacho.'}
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
                {order.order_code}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {order.created_at || new Date().toLocaleString('es-PE')}
              </span>
            </div>
          </div>

          {/* Datos del Cliente y Envío */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Cliente:</span>
              <strong className="text-white text-sm">{order.customer_name}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">DNI del Titular:</span>
              <strong className="text-white font-mono">{order.customer_dni}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Celular de Contacto:</span>
              <strong className="text-white font-mono">{order.customer_phone}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Dirección de Entrega:</span>
              <strong className="text-slate-200">{order.shipping_address}</strong>
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
              <span className="font-mono text-slate-300">S/ {total}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Costo de Envío:</span>
              <span className="font-mono text-emerald-400 font-bold">¡Envío Gratis!</span>
            </div>
            <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-sm">
              <span className="font-bold text-white">Total Liquidado en Soles:</span>
              <span className="text-xl font-black text-orange-400 font-mono">
                S/ {total}
              </span>
            </div>
          </div>

          {/* Información de Pago y Cuenta Receptora del Titular */}
          <div className="p-4 rounded-2xl bg-orange-950/20 border border-orange-500/30 space-y-2">
            <div className="flex items-center gap-2 text-orange-400 font-bold text-xs uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4" />
              Canal de Cobro Directo al Titular
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block">Método de Pago:</span>
                <strong className="text-white">{payment.method || 'Yape'}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">
                  {payment.auth_code ? 'Código de Autorización:' : 'N° de Operación:'}
                </span>
                <strong className="text-emerald-400 font-mono">
                  {payment.auth_code || payment.operation_number || 'OP-CONFIRMADO'}
                </strong>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 text-[11px] block">Cuenta / Destino Oficial del Dueño:</span>
                <strong className="text-orange-300 font-mono text-xs">
                  {payment.destination_account || `Yape: ${storeSettings?.yape_number || '924046690'} (${storeSettings?.owner_name || 'Jeancarlos José Huertas Quichca'})`}
                </strong>
              </div>
            </div>

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
                    <span className="text-[10px] text-slate-400">Registrado en la base de datos SQLite</span>
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

          {/* Botón WhatsApp Destacado */}
          <div className="space-y-3">
            <a
              href={buildWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              <span>Notificar compra y enviar voucher a mi WhatsApp</span>
              <ExternalLink className="w-4 h-4 opacity-80" />
            </a>

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
    </div>
  );
}


import React, { useState } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CreditCard,
  Truck,
} from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';

export default function CartDrawer({ onProceedToCheckout }) {
  const {
    items,
    totalItems,
    subtotal,
    shipping,
    total,
    freeShippingRemaining,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const [checkoutNotification, setCheckoutNotification] = useState(false);

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    setCheckoutNotification(true);
    setTimeout(() => {
      setCheckoutNotification(false);
      closeCart();
      if (onProceedToCheckout) onProceedToCheckout();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-fadeIn"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-600/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white">Tu Carrito Fitness</h2>
                <p className="text-xs text-slate-400">
                  {totalItems} {totalItems === 1 ? 'producto seleccionado' : 'productos seleccionados'}
                </p>
              </div>
            </div>

            <button
              onClick={closeCart}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Cerrar Carrito"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Alert Bar */}
          <div className="bg-slate-950 px-5 py-3 border-b border-slate-800/80">
            {freeShippingRemaining > 0 ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-orange-400" />
                    Agrega <strong className="text-orange-400 font-bold">S/ {freeShippingRemaining.toFixed(2)}</strong> más para
                  </span>
                  <span className="font-extrabold text-amber-400 uppercase text-[11px]">¡Envío Gratis!</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (subtotal / 150) * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>¡Felicidades! Calificas para ENVÍO GRATIS a todo el Perú</span>
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-slate-600 mb-4 border border-slate-700">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-slate-200">Tu carrito está vacío</h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1 mb-6 leading-relaxed">
                  Explora nuestros suplementos deportivos y accesorios fitness para potenciar tu entrenamiento.
                </p>
                <button
                  onClick={closeCart}
                  className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-orange-600/20 transition-all"
                >
                  Explorar Catálogo
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 flex gap-3.5 items-center hover:border-slate-700 transition-all"
                >
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover bg-slate-900 border border-slate-800 shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-200 truncate leading-snug">
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-orange-400 font-extrabold mt-0.5">
                      S/ {item.price.toFixed(2)}
                    </p>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-slate-700 bg-slate-800 rounded-lg p-0.5">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          disabled={item.quantity >= item.stock}
                          className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-30"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-[11px] text-slate-400 font-medium">
                        Subtotal: <strong className="text-slate-200">S/ {(item.quantity * item.price).toFixed(2)}</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Eliminar producto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer: Totals and Checkout CTA */}
          {items.length > 0 && (
            <div className="p-5 bg-slate-950 border-t border-slate-800 space-y-3">
              {/* Financial Breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-200">S/ {subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Costo de Envío:</span>
                  <span>
                    {shipping === 0 ? (
                      <strong className="text-emerald-400 font-bold uppercase text-[11px]">¡Gratis!</strong>
                    ) : (
                      <span className="font-semibold text-slate-200">S/ {shipping.toFixed(2)}</span>
                    )}
                  </span>
                </div>

                <div className="border-t border-slate-800 pt-2 flex justify-between items-baseline text-sm">
                  <span className="font-extrabold text-white">Total a Pagar:</span>
                  <div className="text-xl font-black text-white">
                    <span className="text-orange-500 text-sm mr-1 font-black">S/</span>
                    {total.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Checkout Notification feedback */}
              {checkoutNotification && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center text-xs text-emerald-300 font-bold animate-pulse">
                  ✅ Carrito verificado. Preparando comprobante y orden...
                </div>
              )}

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={checkoutNotification}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-orange-600/30 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>Ir a Pagar (Checkout)</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cobro seguro y directo a cuentas del propietario</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


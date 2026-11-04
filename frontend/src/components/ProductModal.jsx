import React, { useState } from 'react';
import { X, Plus, Minus, ShoppingBag, Check, ShieldCheck, Zap, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';

export default function ProductModal({ product, onClose }) {
  if (!product) return null;

  const { addToCart, items } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const cartItem = items.find((i) => i.id === product.id);
  const currentInCart = cartItem ? cartItem.quantity : 0;
  const availableStock = Math.max(0, product.stock - currentInCart);

  const handleIncrement = () => {
    if (quantity < availableStock) setQuantity((q) => q + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) setQuantity((q) => q - 1);
  };

  const handleAddToCart = () => {
    if (availableStock <= 0) return;
    addToCart(product, quantity);
    setJustAdded(true);
    setTimeout(() => {
      setJustAdded(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-950/70 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700/80 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Left: Product Image */}
        <div className="md:w-1/2 relative bg-slate-950 flex items-center justify-center overflow-hidden min-h-[260px] md:min-h-full">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover object-center max-h-[350px] md:max-h-full"
          />
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <span className="bg-slate-900/90 backdrop-blur-md text-orange-400 text-xs font-bold px-3 py-1 rounded-full border border-orange-500/30">
              {product.category}
            </span>
          </div>
        </div>

        {/* Modal Right: Details and Buying controls */}
        <div className="md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white leading-tight">
              {product.name}
            </h2>

            <div className="flex items-center gap-3 my-3">
              <div className="text-2xl font-black text-white">
                <span className="text-orange-500 text-base mr-1">S/</span>
                {product.price.toFixed(2)}
              </div>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                {availableStock > 0 ? `${availableStock} en stock` : 'Agotado'}
              </span>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed my-4">
              {product.description}
            </p>

            {/* Benefit Highlights */}
            <div className="space-y-2 border-t border-slate-800/80 pt-4 mb-6">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-orange-400 shrink-0" />
                <span>100% Original con registro y garantía</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Truck className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Envío express Lima y provincias en 24h</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Zap className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Paga directo con Yape, Plin o Transferencia BCP</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="border-t border-slate-800/80 pt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center border border-slate-700 bg-slate-800 rounded-xl p-1">
                <button
                  onClick={handleDecrement}
                  disabled={quantity <= 1 || availableStock <= 0}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center text-sm font-bold text-white">
                  {quantity}
                </span>
                <button
                  onClick={handleIncrement}
                  disabled={quantity >= availableStock || availableStock <= 0}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={availableStock <= 0}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 shadow-xl ${
                  justAdded
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                    : availableStock <= 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/30 hover:scale-[1.01]'
                }`}
              >
                {justAdded ? (
                  <>
                    <Check className="w-5 h-5 text-white" />
                    <span>¡Agregado al Carrito!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5" />
                    <span>{availableStock <= 0 ? 'Sin Stock' : 'Agregar al Carrito'}</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-white underline underline-offset-4"
              >
                Seguir explorando la tienda
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


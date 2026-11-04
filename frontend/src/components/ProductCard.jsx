import React, { useState } from 'react';
import { Plus, Minus, ShoppingBag, Eye, Check } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';

export default function ProductCard({ product, onQuickView }) {
  const { addToCart, items } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const cartItem = items.find((i) => i.id === product.id);
  const currentInCart = cartItem ? cartItem.quantity : 0;
  const availableStock = Math.max(0, product.stock - currentInCart);

  const handleIncrement = (e) => {
    e.stopPropagation();
    if (quantity < availableStock) {
      setQuantity((q) => q + 1);
    }
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (availableStock <= 0) return;
    addToCart(product, quantity);
    setJustAdded(true);
    setQuantity(1);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <div
      onClick={() => onQuickView(product)}
      className="group bg-slate-900 rounded-2xl border border-slate-800/80 hover:border-orange-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 flex flex-col overflow-hidden cursor-pointer"
    >
      {/* Product Image & Badges */}
      <div className="relative aspect-square w-full bg-slate-950 overflow-hidden">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Category Badge */}
        <span className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md text-orange-400 text-[11px] font-bold px-2.5 py-1 rounded-full border border-orange-500/30 shadow-md">
          {product.category}
        </span>

        {/* Featured Badge */}
        {product.featured === 1 && (
          <span className="absolute top-3 right-3 bg-gradient-to-r from-orange-600 to-amber-500 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-md tracking-wider">
            Top Ventas
          </span>
        )}

        {/* Quick View Floating Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickView(product);
          }}
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-slate-900/90 hover:bg-orange-600 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-md border border-slate-700/80 hover:border-orange-500 transition-all shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0"
          title="Vista Rápida"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* Product Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-slate-100 text-base leading-snug group-hover:text-orange-400 transition-colors line-clamp-2">
            {product.name}
          </h3>
          <p className="text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80">
          {/* Price & Stock status */}
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <span className="text-xs font-semibold text-slate-400">Precio:</span>
              <div className="text-xl font-extrabold text-white">
                <span className="text-orange-500 text-sm mr-1 font-black">S/</span>
                {product.price.toFixed(2)}
              </div>
            </div>

            <div className="text-right">
              {availableStock > 0 ? (
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Stock: {availableStock} u.
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                  Agotado
                </span>
              )}
            </div>
          </div>

          {/* Action Row: Counter + Add Button */}
          <div className="flex items-center gap-2">
            {/* Quantity controls */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center border border-slate-700 bg-slate-800/60 rounded-xl p-1"
            >
              <button
                onClick={handleDecrement}
                disabled={quantity <= 1 || availableStock <= 0}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-xs font-bold text-white">
                {quantity}
              </span>
              <button
                onClick={handleIncrement}
                disabled={quantity >= availableStock || availableStock <= 0}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={availableStock <= 0}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all duration-200 shadow-md ${
                justAdded
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : availableStock <= 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/20 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>¡Agregado!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>{availableStock <= 0 ? 'Sin Stock' : 'Agregar'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


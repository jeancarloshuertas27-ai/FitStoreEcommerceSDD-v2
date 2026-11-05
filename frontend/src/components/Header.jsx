import React, { useState } from 'react';
import {
  Dumbbell,
  Search,
  ShoppingCart,
  User,
  ShieldCheck,
  X,
  Copy,
  Check,
  Store,
  SlidersHorizontal,
} from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useUser } from '../context/UserContext.jsx';

const CATEGORIES = ['Todos', 'Proteínas', 'Creatinas', 'Pre-Entrenos', 'Accesorios'];

export default function Header({
  activeTab,
  setActiveTab,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  pendingVerificationCount = 0,
}) {
  const { totalItems, openCart } = useCart();
  const { currentUser } = useUser();
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState('');

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
        {/* Top Info Bar / Notification */}
        <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 text-white text-xs font-semibold py-1.5 px-4 text-center tracking-wide flex items-center justify-center gap-2">
          <span>⚡ Envíos a todo el Perú en 24h</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">¡Envío GRATIS en compras desde S/ 150.00!</span>
          <span className="hidden md:inline">•</span>
          <span className="hidden md:inline">Yape / Plin / Transferencia BCP</span>
        </div>

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-4">
            {/* Logo */}
            <div
              onClick={() => setActiveTab('store')}
              className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform duration-200">
                <Dumbbell className="w-6 h-6 text-white transform -rotate-45" />
              </div>
              <div>
                <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-orange-400 bg-clip-text text-transparent">
                  FitStore<span className="text-orange-500">Pro</span>
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 -mt-1">
                  Suplementos & Fitness Perú
                </span>
              </div>
            </div>

            {/* Instant Search Bar */}
            {activeTab === 'store' && (
              <div className="hidden md:flex flex-1 max-w-lg mx-4">
                <div className="relative w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar proteínas, creatinas, pre-entrenos..."
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-full pl-11 pr-10 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all shadow-inner"
                  />
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Actions */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Tienda View Button */}
              <button
                onClick={() => setActiveTab('store')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  activeTab === 'store'
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Store className="w-4 h-4" />
                <span className="hidden sm:inline">Tienda</span>
              </button>

              {/* Mi Perfil y Mis Pedidos */}
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  activeTab === 'profile'
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title={currentUser ? `Conectado como: ${currentUser.name}` : 'Mi Perfil'}
              >
                <User className="w-4 h-4" />
                <div className="text-left hidden lg:block">
                  <span className="block leading-none text-xs text-slate-400">Mi Cuenta</span>
                  <span className="block leading-tight text-xs font-bold text-slate-100 truncate max-w-[120px]">
                    {currentUser?.name?.split(' ')[0] || 'Cliente'}
                  </span>
                </div>
                <span className="lg:hidden hidden sm:inline">Perfil</span>
              </button>

              {/* Botón Carrito */}
              <button
                onClick={openCart}
                className="relative flex items-center justify-center p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-orange-400 hover:text-orange-300 transition-all border border-slate-700/80 hover:border-orange-500/50"
                aria-label="Abrir Carrito"
              >
                <ShoppingCart className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-orange-600 to-amber-500 text-white text-[11px] font-black rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center shadow-lg animate-pulse">
                    {totalItems}
                  </span>
                )}
              </button>

              {/* Botón Acceso Panel Admin */}
              <button
                onClick={() => setActiveTab('admin')}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'admin'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/60'
                }`}
                title="Acceso al Panel de Administración"
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Panel Admin</span>
                {pendingVerificationCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center animate-pulse shadow">
                    {pendingVerificationCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          {activeTab === 'store' && (
            <div className="md:hidden pb-3">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar suplementos fitness..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-full pl-10 pr-8 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Categories Pills & Sort Selector (When in Store tab) */}
          {activeTab === 'store' && (
            <div className="py-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                        isSelected
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30 scale-105'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Price Sort Dropdown */}
              <div className="flex items-center gap-2 text-xs text-slate-300 ml-auto">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                >
                  <option value="featured">Destacados</option>
                  <option value="price_asc">Precio: menor a mayor</option>
                  <option value="price_desc">Precio: mayor a menor</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Modal Acceso Rápido Administrador */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAdminModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Acceso Rápido Administrador</h3>
                <p className="text-xs text-amber-400 font-semibold">Credenciales y Cuentas Verificables</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Para garantizar la <strong className="text-white">verificabilidad sin bloqueos</strong> exigida en la constitución de FitStore Pro, puedes consultar y copiar las credenciales oficiales del Administrador o acceder directamente.
            </p>

            <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 mb-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Correo Admin:</span>
                <div className="flex items-center gap-2">
                  <code className="text-orange-400 font-mono font-semibold">admin@fitstore.pe</code>
                  <button
                    onClick={() => handleCopy('admin@fitstore.pe', 'email')}
                    className="text-slate-400 hover:text-white"
                    title="Copiar correo"
                  >
                    {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Contraseña:</span>
                <div className="flex items-center gap-2">
                  <code className="text-orange-400 font-mono font-semibold">admin123</code>
                  <button
                    onClick={() => handleCopy('admin123', 'pass')}
                    className="text-slate-400 hover:text-white"
                    title="Copiar contraseña"
                  >
                    {copiedField === 'pass' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Titular Recaudador:</span>
                <span className="text-slate-200 font-semibold">Jeancarlos José Huertas</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsAdminModalOpen(false);
                  setActiveTab('profile');
                }}
                className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-lg shadow-orange-600/20"
              >
                Auditar Usuarios y Órdenes
              </button>
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import ProductCard from './components/ProductCard.jsx';
import ProductModal from './components/ProductModal.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import ProfileView from './components/ProfileView.jsx';
import api from './services/api.js';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Truck,
  RotateCcw,
  CreditCard,
  PhoneCall,
  SearchX,
  RefreshCw,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('store'); // 'store' | 'profile'
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);

  // Cargar productos ante cambio de filtros o búsqueda
  useEffect(() => {
    loadProducts();
  }, [selectedCategory, searchQuery, sortBy]);

  // Cargar configuración de la tienda una vez
  useEffect(() => {
    api.getSettings()
      .then((data) => setStoreSettings(data))
      .catch((err) => console.error('Error cargando store_settings:', err));
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getProducts({
        category: selectedCategory,
        search: searchQuery,
        sort: sortBy,
      });
      setProducts(data);
    } catch (err) {
      console.error('Error al cargar productos:', err);
      setError('No pudimos conectar con el servidor de FitStore Pro. Verifica que el backend esté encendido.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedCategory('Todos');
    setSearchQuery('');
    setSortBy('featured');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Header con Buscador, Píldoras de Categoría y Controles */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'profile' ? (
          <ProfileView />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
            {/* Hero Banner Fitness */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-orange-950 via-slate-900 to-slate-900 border border-orange-500/30 p-8 sm:p-10 shadow-2xl">
              <div className="max-w-2xl relative z-10 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Potencia Tu Rendimiento Físico</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
                  Suplementos Oficiales y Accesorios <span className="text-orange-500">100% Originales</span>
                </h1>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                  Proteínas, Creatinas Creapure, Pre-Entrenos explosivos y accesorios de gimnasio con entrega en 24h a todo el Perú y cobros directos y transparentes.
                </p>

                {/* Badges bar */}
                <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300 font-semibold">
                  <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                    <Truck className="w-4 h-4 text-orange-400" />
                    <span>Envío Gratis desde S/ 150</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                    <CreditCard className="w-4 h-4 text-orange-400" />
                    <span>Yape, Plin y BCP en Soles</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Garantía de Calidad FitStore</span>
                  </div>
                </div>
              </div>

              {/* Decorative Background Accents */}
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-orange-600/10 to-transparent pointer-events-none hidden lg:block" />
            </div>

            {/* Catalog Section Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <span>Catálogo de Suplementos</span>
                  <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-500/20">
                    {products.length} {products.length === 1 ? 'producto' : 'productos'}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedCategory === 'Todos'
                    ? 'Mostrando todos los suplementos y accesorios disponibles'
                    : `Filtrado por categoría: ${selectedCategory}`}
                  {searchQuery && ` que coinciden con "${searchQuery}"`}
                </p>
              </div>

              {(selectedCategory !== 'Todos' || searchQuery) && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 text-xs font-bold text-orange-400 hover:text-orange-300 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restablecer Filtros</span>
                </button>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-center text-rose-300 text-sm font-semibold space-y-3">
                <p>{error}</p>
                <button
                  onClick={loadProducts}
                  className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar Conexión</span>
                </button>
              </div>
            )}

            {/* Loading State */}
            {loading && !error && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div
                    key={n}
                    className="bg-slate-900 rounded-2xl border border-slate-800/80 p-4 space-y-4 animate-pulse"
                  >
                    <div className="aspect-square bg-slate-800 rounded-xl w-full" />
                    <div className="h-4 bg-slate-800 rounded w-3/4" />
                    <div className="h-3 bg-slate-800 rounded w-1/2" />
                    <div className="h-8 bg-slate-800 rounded-xl w-full mt-4" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && products.length === 0 && (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-12 text-center max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                  <SearchX className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">No se encontraron productos</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  No hay suplementos que coincidan con los criterios de búsqueda o categoría seleccionada.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-orange-600/20 transition-all"
                >
                  Ver Todos los Productos
                </button>
              </div>
            )}

            {/* Products Grid */}
            {!loading && !error && products.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onQuickView={(p) => setSelectedProduct(p)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal de Detalle Rápido de Producto */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Drawer Deslizable de Carrito de Compras */}
      <CartDrawer
        onProceedToCheckout={() => {
          setActiveTab('profile');
        }}
      />

      {/* Footer de FitStore Pro */}
      <footer className="mt-16 bg-slate-900 border-t border-slate-800 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Col 1: About */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-base font-extrabold text-white">FitStore Pro</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Plataforma de comercio electrónico de nutrición deportiva y gimnasio con cobros dirigidos a las cuentas directas del propietario.
              </p>
              <div className="text-[11px] text-slate-500">
                Moneda oficial: <strong className="text-slate-300">Soles (S/ - PEN)</strong>
              </div>
            </div>

            {/* Col 2: Cuentas Receptoras del Propietario */}
            <div className="space-y-2">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                Cuentas Receptoras del Propietario
              </h4>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-[11px]">
                <div className="text-slate-300 font-semibold">
                  Titular: <span className="text-orange-400">{storeSettings?.owner_name || 'Jeancarlos José Huertas Quichca'}</span>
                </div>
                <div>Yape: <strong className="text-white">{storeSettings?.yape_number || '924046690'}</strong></div>
                <div>Plin: <strong className="text-white">{storeSettings?.plin_number || '983064501'}</strong></div>
                <div>Banco: <strong className="text-white">{storeSettings?.bank_name || 'BCP'}</strong></div>
                <div>N° Cuenta: <strong className="text-white font-mono">{storeSettings?.bank_account_soles || '22079349234041'}</strong></div>
                <div>CCI: <strong className="text-white font-mono">{storeSettings?.bank_cci || '00222017934923404128'}</strong></div>
              </div>
            </div>

            {/* Col 3: Legal & Support */}
            <div className="space-y-2">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                Atención y Envíos
              </h4>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Despachos a Lima Metropolitana y provincias a través de Olva Courier y Shalom. Consultas directas vía WhatsApp:
              </p>
              <div className="flex items-center gap-2 text-white font-bold text-xs bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 w-fit">
                <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                <span>+51 {storeSettings?.whatsapp_notification || '983064501'}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <div>© 2026 FitStore Pro - Todos los derechos reservados. Perú.</div>
            <div className="flex items-center gap-4">
              <span>Mercado Peruano (S/)</span>
              <span>•</span>
              <span>DNI 8 Dígitos</span>
              <span>•</span>
              <span>SQLite Zero-Setup</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


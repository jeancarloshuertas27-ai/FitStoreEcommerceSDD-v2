import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import ProductCard from './components/ProductCard.jsx';
import ProductModal from './components/ProductModal.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import ProfileView from './components/ProfileView.jsx';
import CheckoutModal from './components/CheckoutModal.jsx';
import MercadoPagoReturnHandler from './components/MercadoPagoReturnHandler.jsx';
import FitBotModal from './components/FitBotModal.jsx';
import AuthModal from './components/AuthModal.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { useUser } from './context/UserContext.jsx';
import api from './services/api.js';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Truck,
  RotateCcw,
  CreditCard,
  MessageSquare,
  SearchX,
  RefreshCw,
} from 'lucide-react';

const IS_STORE_ONLY = import.meta.env?.VITE_STORE_ONLY === 'true';
const IS_ADMIN_ONLY = import.meta.env?.VITE_ADMIN_ONLY === 'true';
const AdminPanel = IS_STORE_ONLY
  ? null
  : React.lazy(() => import('./components/AdminPanel.jsx'));

export default function App() {
  const [activeTab, setActiveTab] = useState('store'); // 'store' | 'profile' | 'admin'
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [authModal, setAuthModal] = useState({ open: false, mode: 'login' });
  const [pendingVerificationCount, setPendingVerificationCount] = useState(0);

  const { currentUser } = useUser();

  const loadSettings = () => {
    if (IS_STORE_ONLY) return;
    api.getSettings()
      .then((data) => setStoreSettings(data))
      .catch((err) => console.error('Error cargando store_settings:', err));
  };

  const loadPendingOrdersCount = () => {
    if (IS_STORE_ONLY) return;
    api.getAllOrders()
      .then((orders) => {
        const count = orders.filter(
          (o) =>
            o.order_status === 'En Verificación' ||
            o.payment?.payment_status === 'Pendiente de Verificación'
        ).length;
        setPendingVerificationCount(count);
      })
      .catch((err) => console.error('Error cargando conteo de pedidos:', err));
  };

  // Cargar productos ante cambio de filtros, búsqueda o cambio a pestaña tienda
  useEffect(() => {
    if (!IS_ADMIN_ONLY && activeTab === 'store') {
      loadProducts();
    }
  }, [selectedCategory, searchQuery, sortBy, activeTab]);

  // Cargar configuración de la tienda y pedidos al montar
  useEffect(() => {
    loadSettings();
    if (IS_ADMIN_ONLY) return;

    if (!IS_STORE_ONLY) {
      loadPendingOrdersCount();
    }

    const syncHashTab = () => {
      if (window.location.hash === '#profile') {
        setActiveTab('profile');
      }
    };
    syncHashTab();
    window.addEventListener('hashchange', syncHashTab);
    return () => window.removeEventListener('hashchange', syncHashTab);
  }, []);

  useEffect(() => {
    if (isCheckoutOpen) {
      loadSettings();
    }
  }, [isCheckoutOpen]);

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

  if (IS_ADMIN_ONLY && AdminPanel) {
    return (
      <ErrorBoundary>
        <React.Suspense
          fallback={
            <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center text-sm font-bold">
              Cargando Panel de Administración FitStore Pro...
            </div>
          }
        >
          <AdminPanel
            storeSettings={storeSettings}
            onUpdateSettings={(updated) => setStoreSettings(updated)}
            onNavigateStore={() => {
              const storeUrl =
                import.meta.env?.VITE_STORE_URL ||
                'https://fitstore-tienda.j34n.workers.dev';
              window.open(
                storeUrl,
                '_blank',
                'noopener,noreferrer'
              );
            }}
          />
        </React.Suspense>
      </ErrorBoundary>
    );
  }

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
        pendingVerificationCount={pendingVerificationCount}
        onOpenAuth={(mode = 'login') => setAuthModal({ open: true, mode })}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {!IS_STORE_ONLY && activeTab === 'admin' && AdminPanel ? (
          <ErrorBoundary>
            <React.Suspense fallback={<div className="p-10 text-center text-slate-400 text-xs">Cargando panel administrativo...</div>}>
              <AdminPanel
                storeSettings={storeSettings}
                onUpdateSettings={(updated) => setStoreSettings(updated)}
                onNavigateStore={() => {
                  setActiveTab('store');
                  loadProducts();
                }}
                onOrdersUpdated={(ordersList) => {
                  const pending = ordersList.filter(
                    (o) =>
                      o.order_status === 'En Verificación' ||
                      o.payment?.payment_status === 'Pendiente de Verificación'
                  ).length;
                  setPendingVerificationCount(pending);
                }}
              />
            </React.Suspense>
          </ErrorBoundary>
        ) : activeTab === 'profile' ? (
          <ProfileView
            onOpenAuth={(mode = 'login') => setAuthModal({ open: true, mode })}
          />
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
                  Proteínas, Creatinas Creapure, Pre-Entrenos explosivos y accesorios de gimnasio con entrega en 24h a todo el Perú y pagos 100% seguros con verificación automática.
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
              searchQuery.trim() || selectedCategory !== 'Todos' ? (
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
              ) : (
                <div className="bg-slate-900 rounded-3xl border border-slate-800 p-12 text-center max-w-lg mx-auto space-y-4">
                  <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center mx-auto">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Catálogo en actualización. Pronto habrá nuevos productos disponibles
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Nuestro equipo está renovando el stock de suplementos y equipamiento deportivo. Vuelve muy pronto o crea tu cuenta para recibir novedades.
                  </p>
                </div>
              )
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
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
      />

      {/* Modal de Checkout en 2 Pasos con Pasarela Integrada */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        currentUser={currentUser}
        onOrderCompleted={(newOrder) => {
          loadPendingOrdersCount();
          loadProducts();
          console.log('Orden completada exitosamente:', newOrder.order_code);
        }}
      />

      {/* Retorno de Mercado Pago Checkout Pro (verificación de payment_id en backend) */}
      {!IS_ADMIN_ONLY && (
        <MercadoPagoReturnHandler
          onOrderCompleted={() => {
            loadPendingOrdersCount();
            loadProducts();
          }}
        />
      )}

      {/* Modal de Inicio de Sesión y Registro de Clientes */}
      <AuthModal
        isOpen={authModal.open}
        initialMode={authModal.mode}
        onClose={() => setAuthModal((prev) => ({ ...prev, open: false }))}
      />

      {/* Chatbot Asesor Deportivo Inteligente FitBot */}
      <FitBotModal
        products={products}
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
                Plataforma de comercio electrónico de nutrición deportiva y gimnasio con pasarela de pagos integrada y verificación instantánea.
              </p>
              <div className="text-[11px] text-slate-500">
                Moneda oficial: <strong className="text-slate-300">Soles (S/ - PEN)</strong>
              </div>
            </div>

            {/* Col 2: Métodos de Pago Aceptados */}
            <div className="space-y-2">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                Métodos de Pago Aceptados
              </h4>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2 text-slate-300 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pasarela Segura FitStore Pro</span>
                </div>
                <div>• Billeteras digitales: <strong className="text-white">Yape / Plin (OTP 6 dígitos)</strong></div>
                <div>• Banca en línea: <strong className="text-white">Transferencia con Código CIP</strong></div>
                <div>• Tarjetas: <strong className="text-white">Visa / Mastercard (3D Secure)</strong></div>
              </div>
            </div>

            {/* Col 3: Atención y Envíos */}
            <div className="space-y-2">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                Atención y Envíos
              </h4>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Despachos a Lima Metropolitana y provincias a través de Olva Courier y Shalom. Consulta el estado de tu orden en línea:
              </p>
              <div className="flex items-center gap-2 text-white font-bold text-xs bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 w-fit">
                <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                <span>Soporte 24/7 con FitBot AI</span>
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
              <span>Pago Seguro SSL</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


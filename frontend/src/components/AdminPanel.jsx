import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Package,
  Receipt,
  Users,
  Settings,
  Store,
  LogOut,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Edit2,
  Trash2,
  Search,
  Eye,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  DollarSign,
  Truck,
  ArrowLeft,
  X,
  CreditCard,
  Building2,
  Phone,
  QrCode,
  FileText,
} from 'lucide-react';
import api from '../services/api.js';

const SAMPLE_FITNESS_IMAGES = [
  {
    name: 'Proteína Whey Estándar',
    url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Creatina Monohidratada',
    url: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Pre-Entreno Explosivo',
    url: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Shaker Mezclador Fit',
    url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Cinturón de Fuerza Gym',
    url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=800',
  },
];

export default function AdminPanel({
  storeSettings,
  onUpdateSettings,
  onNavigateStore,
  onOrdersUpdated,
}) {
  // Estado de autenticación admin persistido en localStorage
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return localStorage.getItem('fitstore_admin_auth') === 'true';
  });

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Pestañas activas: 'products' | 'orders' | 'users' | 'settings'
  const [activeTab, setActiveTab] = useState('orders');

  // Datos del backend
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Modales
  const [selectedVoucherOrder, setSelectedVoucherOrder] = useState(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteProductConfirm, setDeleteProductConfirm] = useState(null);

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Filtros
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('Todos');
  const [orderStatusFilter, setOrderStatusFilter] = useState('Todos');
  const [userSearch, setUserSearch] = useState('');

  // Formulario de Producto
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category: 'Proteínas',
    price: '',
    stock: '',
    image_url: SAMPLE_FITNESS_IMAGES[0].url,
    featured: 0,
  });

  // Formulario de Usuario
  const [userForm, setUserForm] = useState({
    name: '',
    dni: '',
    email: '',
    phone: '',
    address: '',
    city: 'Lima',
  });

  // Formulario de Configuración de Cuentas Receptoras
  const [settingsForm, setSettingsForm] = useState({
    owner_name: '',
    yape_number: '',
    plin_number: '',
    bank_name: '',
    bank_account_soles: '',
    bank_cci: '',
    whatsapp_notification: '',
  });

  // Copia al portapapeles
  const [copiedField, setCopiedField] = useState('');

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  // Cargar datos al iniciar sesión o cambiar pestaña
  useEffect(() => {
    if (isAdminAuthenticated) {
      loadAllAdminData();
    }
  }, [isAdminAuthenticated]);

  useEffect(() => {
    if (storeSettings) {
      setSettingsForm({
        owner_name: storeSettings.owner_name || '',
        yape_number: storeSettings.yape_number || '',
        plin_number: storeSettings.plin_number || '',
        bank_name: storeSettings.bank_name || '',
        bank_account_soles: storeSettings.bank_account_soles || '',
        bank_cci: storeSettings.bank_cci || '',
        whatsapp_notification: storeSettings.whatsapp_notification || '',
      });
    }
  }, [storeSettings]);

  const showNotification = (msg, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 4500);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  const loadAllAdminData = async () => {
    try {
      setLoading(true);
      const [prodsData, ordersData, usersData, settData] = await Promise.all([
        api.getProducts(),
        api.getAllOrders(),
        api.getUsers(),
        api.getSettings(),
      ]);
      setProducts(prodsData);
      setOrders(ordersData);
      setUsers(usersData);
      if (settData) {
        setSettingsForm({
          owner_name: settData.owner_name || '',
          yape_number: settData.yape_number || '',
          plin_number: settData.plin_number || '',
          bank_name: settData.bank_name || '',
          bank_account_soles: settData.bank_account_soles || '',
          bank_cci: settData.bank_cci || '',
          whatsapp_notification: settData.whatsapp_notification || '',
        });
      }
      if (onOrdersUpdated) {
        onOrdersUpdated(ordersData);
      }
    } catch (err) {
      console.error('Error cargando datos de administración:', err);
      showNotification('Error al sincronizar datos desde SQLite', true);
    } finally {
      setLoading(false);
    }
  };

  // Login de demostración 1-clic
  const handleDemoAdminLogin = () => {
    setLoginEmail('admin@fitstore.pe');
    setLoginPassword('admin123');
    setLoginError('');
    localStorage.setItem('fitstore_admin_auth', 'true');
    setIsAdminAuthenticated(true);
    showNotification('¡Acceso Rápido Administrador completado exitosamente!');
  };

  const handleManualLogin = (e) => {
    e.preventDefault();
    if (loginEmail === 'admin@fitstore.pe' && loginPassword === 'admin123') {
      localStorage.setItem('fitstore_admin_auth', 'true');
      setIsAdminAuthenticated(true);
      setLoginError('');
      showNotification('Sesión de Administrador iniciada correctamente');
    } else {
      setLoginError('Credenciales incorrectas. Usa admin@fitstore.pe / admin123 o el botón de 1 clic.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('fitstore_admin_auth');
    setIsAdminAuthenticated(false);
    setLoginEmail('');
    setLoginPassword('');
    showNotification('Sesión de Administrador cerrada');
  };

  // CÁLCULO DE KPIS EN TIEMPO REAL
  const totalRevenue = orders
    .filter((o) => o.order_status !== 'Cancelado' && o.payment?.payment_status === 'Aprobado')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const pendingVerificationOrders = orders.filter(
    (o) =>
      o.order_status === 'En Verificación' ||
      o.payment?.payment_status === 'Pendiente de Verificación'
  );

  const lowStockProducts = products.filter((p) => p.stock <= 5);

  const totalClients = users.filter((u) => u.role === 'client');

  // GESTIÓN DE PRODUCTOS
  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      description: '',
      category: 'Proteínas',
      price: '',
      stock: '',
      image_url: SAMPLE_FITNESS_IMAGES[0].url,
      featured: 0,
    });
    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      description: prod.description || '',
      category: prod.category,
      price: prod.price,
      stock: prod.stock,
      image_url: prod.image_url,
      featured: prod.featured || 0,
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      if (!productForm.name.trim()) {
        showNotification('El nombre del producto es obligatorio', true);
        return;
      }
      const numPrice = Number(productForm.price);
      if (isNaN(numPrice) || numPrice <= 0) {
        showNotification('El precio debe ser un número positivo en Soles (S/)', true);
        return;
      }
      const numStock = Number(productForm.stock);
      if (isNaN(numStock) || numStock < 0) {
        showNotification('El stock debe ser un entero mayor o igual a 0', true);
        return;
      }

      const payload = {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        category: productForm.category,
        price: numPrice,
        stock: parseInt(numStock, 10),
        image_url: productForm.image_url.trim(),
        featured: productForm.featured ? 1 : 0,
      };

      if (editingProduct) {
        await api.updateProduct(editingProduct.id, payload);
        showNotification(`Producto "${payload.name}" actualizado con éxito`);
      } else {
        await api.createProduct(payload);
        showNotification(`Nuevo producto "${payload.name}" añadido al catálogo`);
      }
      setProductModalOpen(false);
      await loadAllAdminData();
    } catch (err) {
      console.error('Error guardando producto:', err);
      showNotification(err.message || 'Error al guardar producto', true);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductConfirm) return;
    try {
      await api.deleteProduct(deleteProductConfirm.id);
      showNotification(`Producto "${deleteProductConfirm.name}" eliminado del catálogo`);
      setDeleteProductConfirm(null);
      await loadAllAdminData();
    } catch (err) {
      console.error('Error eliminando producto:', err);
      showNotification(err.message || 'Error al eliminar producto', true);
    }
  };

  // GESTIÓN DE PEDIDOS Y VOUCHERS
  const handleUpdatePaymentStatus = async (orderId, newStatus) => {
    try {
      const res = await api.updatePaymentStatus(orderId, newStatus);
      if (newStatus === 'Aprobado') {
        showNotification(
          `¡Abono de orden ORD-2026-${String(orderId).padStart(3, '0')} aprobado en mi cuenta! Pedido pasó a "Pagado / En Preparación".`
        );
      } else {
        showNotification(
          `Voucher rechazado. Orden cancelada y stock restituido automáticamente en SQLite.`
        );
      }
      setSelectedVoucherOrder(null);
      await loadAllAdminData();
    } catch (err) {
      console.error('Error actualizando pago:', err);
      showNotification(err.message || 'Error al actualizar el pago', true);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      showNotification(`Estado logístico de la orden actualizado a: ${newStatus}`);
      await loadAllAdminData();
    } catch (err) {
      console.error('Error actualizando estado:', err);
      showNotification(err.message || 'Error al actualizar estado del pedido', true);
    }
  };

  // GESTIÓN DE CLIENTES
  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUserForm({
      name: '',
      dni: '',
      email: '',
      phone: '',
      address: '',
      city: 'Lima',
    });
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    setUserForm({
      name: u.name,
      dni: u.dni,
      email: u.email,
      phone: u.phone,
      address: u.address,
      city: u.city,
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (!/^\d{8}$/.test(userForm.dni)) {
        showNotification('El DNI debe contener exactamente 8 dígitos numéricos', true);
        return;
      }
      if (!/^\d{9}$/.test(userForm.phone)) {
        showNotification('El número de celular debe contener exactamente 9 dígitos numéricos', true);
        return;
      }

      if (editingUser) {
        await api.updateUser(editingUser.id, userForm);
        showNotification(`Datos del cliente "${userForm.name}" actualizados`);
      } else {
        await api.createUser({
          ...userForm,
          role: 'client',
          password: 'cliente123',
        });
        showNotification(`Nuevo cliente "${userForm.name}" registrado en SQLite`);
      }
      setUserModalOpen(false);
      await loadAllAdminData();
    } catch (err) {
      console.error('Error guardando usuario:', err);
      showNotification(err.message || 'Error al procesar cliente', true);
    }
  };

  // CONFIGURAR MIS CUENTAS RECEPTORAS (store_settings)
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      if (!settingsForm.owner_name.trim()) {
        showNotification('El nombre de titular es obligatorio', true);
        return;
      }
      if (settingsForm.yape_number && !/^\d{9}$/.test(settingsForm.yape_number)) {
        showNotification('El número de Yape debe contener exactamente 9 dígitos', true);
        return;
      }
      if (settingsForm.plin_number && !/^\d{9}$/.test(settingsForm.plin_number)) {
        showNotification('El número de Plin debe contener exactamente 9 dígitos', true);
        return;
      }
      if (settingsForm.whatsapp_notification && !/^\d{9}$/.test(settingsForm.whatsapp_notification)) {
        showNotification('El WhatsApp debe contener exactamente 9 dígitos', true);
        return;
      }

      const updated = await api.updateSettings(settingsForm);
      if (onUpdateSettings) {
        onUpdateSettings(updated);
      }
      showNotification('¡Cuentas bancarias y números de Yape/Plin guardados en caliente con éxito!');
    } catch (err) {
      console.error('Error guardando configuración:', err);
      showNotification(err.message || 'Error al guardar cuentas receptoras', true);
    }
  };

  // --------------------------------------------------------------------------
  // VISTA 1: LOGIN DE ADMINISTRADOR (SI NO ESTÁ AUTENTICADO)
  // --------------------------------------------------------------------------
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-amber-500/40 rounded-3xl p-8 shadow-2xl relative space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <h1 className="text-2xl font-black text-white">Panel de Administración</h1>
            <p className="text-xs text-slate-300">
              FitStore Pro • Gestión de Productos, Pedidos, Vouchers y Cuentas Bancarias
            </p>
          </div>

          {/* BOTÓN REQUERIDO: Acceso Rápido Admin Demo (1 clic) */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
              ⚡ Verificabilidad Constitucional
            </span>
            <button
              type="button"
              onClick={handleDemoAdminLogin}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 group"
            >
              <Sparkles className="w-5 h-5 text-slate-950 group-hover:rotate-12 transition-transform" />
              <span>Acceso Rápido Admin Demo (1 clic)</span>
            </button>
            <p className="text-[11px] text-slate-400">
              Autocompleta <code className="text-amber-300 font-mono">admin@fitstore.pe</code> / <code className="text-amber-300 font-mono">admin123</code> e ingresa sin fricción.
            </p>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-wider">
              o ingreso manual
            </span>
          </div>

          {loginError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleManualLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@fitstore.pe"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all border border-slate-700 hover:border-slate-600"
            >
              Iniciar Sesión Admin
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              onClick={onNavigateStore}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a la Tienda de Suplementos</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VISTA 2: PANEL DE ADMINISTRACIÓN PRINCIPAL
  // --------------------------------------------------------------------------
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      productCategoryFilter === 'Todos' || p.category === productCategoryFilter;
    const matchesSearch =
      !productSearch.trim() ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter === 'Todos') return true;
    if (orderStatusFilter === 'En Verificación') {
      return (
        o.order_status === 'En Verificación' ||
        o.payment?.payment_status === 'Pendiente de Verificación'
      );
    }
    if (orderStatusFilter === 'Pagado') {
      return (
        o.order_status === 'Pagado / En Preparación' ||
        o.payment?.payment_status === 'Aprobado'
      );
    }
    return o.order_status === orderStatusFilter;
  });

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const s = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(s) ||
      u.dni.includes(s) ||
      u.email.toLowerCase().includes(s) ||
      (u.phone && u.phone.includes(s))
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra de Notificaciones Flotantes */}
      {successMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-5 right-5 z-50 bg-rose-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-bounce">
          <AlertTriangle className="w-5 h-5 text-white shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* HEADER DEL PANEL ADMINISTRATIVO */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-md">
              <ShieldCheck className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-white">Panel de Administración</span>
                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                  Admin Demo
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                FitStore Pro • Base de datos SQLite activa con auto-seed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadAllAdminData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
              title="Refrescar datos desde SQLite"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            <button
              onClick={onNavigateStore}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md shadow-orange-600/30 transition-all"
            >
              <Store className="w-4 h-4" />
              <span>Ir a la Tienda</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 hover:border-rose-500/40 border border-slate-700 text-xs font-semibold transition-all"
              title="Cerrar sesión de administrador"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* 4 PESTAÑAS DE NAVEGACIÓN ADMINISTRATIVA */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto no-scrollbar gap-2 border-t border-slate-800/60 pt-2 pb-2">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'products'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>1. Productos y Precios</span>
            <span className="bg-slate-900/60 px-2 py-0.5 rounded-full text-[10px]">
              {products.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap relative ${
              activeTab === 'orders'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>2. Pedidos y Vouchers</span>
            {pendingVerificationOrders.length > 0 && (
              <span className="bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full text-[10px] animate-pulse">
                {pendingVerificationOrders.length} por verificar
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>3. Gestión de Clientes</span>
            <span className="bg-slate-900/60 px-2 py-0.5 rounded-full text-[10px]">
              {totalClients.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>4. Configurar Mis Cuentas Receptoras</span>
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL DEL DASHBOARD */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* RF2: DASHBOARD DE INDICADORES FINANCIEROS (4 KPIS EN TIEMPO REAL) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Total Recaudado en Mis Cuentas */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total Recaudado</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white">
              S/ {totalRevenue.toFixed(2)}
            </div>
            <p className="text-[11px] text-emerald-400 font-semibold">
              ✓ Ingresos confirmados en mis cuentas
            </p>
          </div>

          {/* KPI 2: Pagos Pendientes de Verificación */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Pagos por Verificar</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-400">
              {pendingVerificationOrders.length}
            </div>
            <p className="text-[11px] text-slate-400">
              {pendingVerificationOrders.length > 0 ? (
                <span className="text-amber-300 font-semibold">
                  ⚠️ Vouchers Yape/Plin esperando aprobación
                </span>
              ) : (
                'Sin comprobantes pendientes'
              )}
            </p>
          </div>

          {/* KPI 3: Total de Pedidos y Catálogo con alerta bajo stock */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Catálogo y Pedidos</span>
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white">
              {orders.length} <span className="text-sm font-normal text-slate-400">pedidos</span> / {products.length} <span className="text-sm font-normal text-slate-400">prods</span>
            </div>
            <div className="text-[11px]">
              {lowStockProducts.length > 0 ? (
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {lowStockProducts.length} con stock bajo (≤ 5)
                </span>
              ) : (
                <span className="text-slate-400">Stock en niveles óptimos</span>
              )}
            </div>
          </div>

          {/* KPI 4: Total de Clientes Registrados */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Clientes Registrados</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white">
              {totalClients.length}
            </div>
            <p className="text-[11px] text-slate-400">
              Compradores con DNI verificado en SQLite
            </p>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PESTAÑA 1: GESTIÓN DE PRODUCTOS Y PRECIOS (CRUD COMPLETO) */}
        {/* ========================================================================= */}
        {activeTab === 'products' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Barra de Controles y Búsqueda */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Buscar producto por nombre o descripción..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {['Todos', 'Proteínas', 'Creatinas', 'Pre-Entrenos', 'Accesorios'].map(
                    (cat) => (
                      <button
                        key={cat}
                        onClick={() => setProductCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          productCategoryFilter === cat
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>
              </div>

              <button
                onClick={handleOpenCreateProduct}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-orange-600/20 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Nuevo Producto</span>
              </button>
            </div>

            {/* Tabla de Productos */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Producto</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">Precio (S/)</th>
                      <th className="py-3 px-4">Stock</th>
                      <th className="py-3 px-4">Destacado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-slate-500">
                          No se encontraron productos que coincidan con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => {
                        const isOutOfStock = p.stock === 0;
                        const isLowStock = p.stock > 0 && p.stock <= 5;
                        return (
                          <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  className="w-12 h-12 object-cover rounded-lg bg-slate-800 border border-slate-700 shrink-0"
                                  onError={(e) => {
                                    e.target.src = SAMPLE_FITNESS_IMAGES[0].url;
                                  }}
                                />
                                <div>
                                  <div className="font-bold text-white text-xs">{p.name}</div>
                                  <div className="text-[11px] text-slate-400 line-clamp-1 max-w-sm">
                                    {p.description}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md text-[11px] font-semibold">
                                {p.category}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-extrabold text-orange-400 text-sm">
                                S/ {Number(p.price).toFixed(2)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {isOutOfStock ? (
                                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                  <XCircle className="w-3 h-3" />
                                  Agotado (0)
                                </span>
                              ) : isLowStock ? (
                                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1 animate-pulse">
                                  <AlertTriangle className="w-3 h-3" />
                                  ¡Bajo Stock! ({p.stock} un.)
                                </span>
                              ) : (
                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-semibold text-[10px]">
                                  {p.stock} unidades
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {p.featured ? (
                                <span className="text-amber-400 font-bold text-[11px]">★ Sí</span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">No</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenEditProduct(p)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-orange-400 hover:text-orange-300 transition-colors"
                                  title="Editar producto, precio o stock"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteProductConfirm(p)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition-colors"
                                  title="Eliminar producto"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 2: GESTIÓN DE PEDIDOS Y VERIFICACIÓN DE VOUCHERS */}
        {/* ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Filtros de Estado */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {[
                  'Todos',
                  'En Verificación',
                  'Pagado',
                  'Enviado',
                  'Entregado',
                  'Cancelado',
                ].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      orderStatusFilter === st
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-400 font-semibold">
                Mostrando {filteredOrders.length} {filteredOrders.length === 1 ? 'pedido' : 'pedidos'}
              </div>
            </div>

            {/* Tabla de Pedidos */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Orden / Fecha</th>
                      <th className="py-3 px-4">Cliente & DNI</th>
                      <th className="py-3 px-4">Productos</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Método & Cuenta Destino</th>
                      <th className="py-3 px-4">Estado Pago</th>
                      <th className="py-3 px-4">Despacho</th>
                      <th className="py-3 px-4 text-right">Comprobante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-slate-500">
                          No hay pedidos registrados con el filtro seleccionado.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((o) => {
                        const isPending =
                          o.order_status === 'En Verificación' ||
                          o.payment?.payment_status === 'Pendiente de Verificación';
                        const isPaid =
                          o.order_status === 'Pagado / En Preparación' ||
                          o.payment?.payment_status === 'Aprobado';
                        const isCancelled = o.order_status === 'Cancelado';

                        return (
                          <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-mono font-bold text-orange-400">
                                {o.order_code}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {o.created_at ? o.created_at.substring(0, 16) : 'Reciente'}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-white">{o.customer_name}</div>
                              <div className="text-[11px] text-slate-400">
                                DNI: <span className="font-mono text-slate-300">{o.customer_dni}</span> • Cel: {o.customer_phone}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate max-w-xs">
                                {o.shipping_address}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="space-y-0.5 max-w-xs">
                                {o.items && o.items.length > 0 ? (
                                  o.items.map((it, idx) => (
                                    <div key={idx} className="text-[11px] text-slate-300 truncate">
                                      <span className="font-bold text-white">{it.quantity}x</span> {it.product_name}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-slate-500 text-[11px]">Sin detalles</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-black text-white text-sm">
                                S/ {Number(o.total).toFixed(2)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <span className="font-bold text-slate-200">
                                  {o.payment?.method || 'Yape'}
                                </span>
                                {o.payment?.operation_number && (
                                  <div className="text-[10px] text-orange-400 font-mono">
                                    N° Op: {o.payment.operation_number}
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-400 truncate max-w-[200px]" title={o.payment?.destination_account}>
                                  Destino: <strong className="text-slate-300">{o.payment?.destination_account || 'Cuenta del Propietario'}</strong>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {isPending ? (
                                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                  <Receipt className="w-3 h-3" />
                                  Pendiente
                                </span>
                              ) : isPaid ? (
                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Aprobado
                                </span>
                              ) : isCancelled ? (
                                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2.5 py-1 rounded-full font-bold text-[10px]">
                                  Rechazado
                                </span>
                              ) : (
                                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">
                                  {o.payment?.payment_status || 'Sin pago'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={o.order_status}
                                onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                                className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                              >
                                <option value="En Verificación">En Verificación</option>
                                <option value="Pagado / En Preparación">Pagado / En Prep.</option>
                                <option value="Enviado">Enviado 🚚</option>
                                <option value="Entregado">Entregado ✓</option>
                                <option value="Cancelado">Cancelado ✕</option>
                              </select>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => setSelectedVoucherOrder(o)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                  isPending
                                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 animate-pulse'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                }`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver Voucher</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 3: GESTIÓN DE CLIENTES */}
        {/* ========================================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Controles de Clientes */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Buscar por nombre, DNI de 8 dígitos o email..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <button
                onClick={handleOpenCreateUser}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-orange-600/20 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Nuevo Cliente</span>
              </button>
            </div>

            {/* Tabla de Clientes */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">DNI (8 dígitos)</th>
                      <th className="py-3 px-4">Celular</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Dirección y Ciudad</th>
                      <th className="py-3 px-4">Compras</th>
                      <th className="py-3 px-4">Total Gastado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-slate-500">
                          No se encontraron clientes registrados.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{u.name}</span>
                              {u.role === 'admin' && (
                                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                  Admin
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-300">
                            {u.dni}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {u.phone}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {u.email}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {u.address}, {u.city}
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
                              {u.orders_count || 0} pedidos
                            </span>
                          </td>
                          <td className="py-3 px-4 font-black text-orange-400">
                            S/ {(Number(u.total_spent) || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-orange-400 hover:text-orange-300 transition-colors"
                              title="Editar datos del cliente"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 4: CONFIGURAR MIS CUENTAS RECEPTORAS (store_settings) */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 text-slate-950 flex items-center justify-center font-bold shadow-lg">
                  <Building2 className="w-6 h-6 text-slate-950" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">
                    Configurar Mis Cuentas Receptoras
                  </h2>
                  <p className="text-xs text-slate-400">
                    Cuentas oficiales de cobro directo conectadas a la tabla <code className="text-orange-400">store_settings</code> en SQLite
                  </p>
                </div>
              </div>

              {/* Banner informativo de propagación en tiempo real */}
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-white">Impacto en Caliente:</strong> Cualquier cambio guardado aquí actualizará <strong className="text-orange-300">de inmediato</strong> los datos de cobro que ven los clientes en el Checkout (códigos QR de Yape y Plin, números de cuenta BCP y CCI, y pie de página) sin reiniciar el servidor.
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-5">
                {/* Nombre de Titular Oficial */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Nombre del Titular Recaudador (Dueño de la Tienda)
                  </label>
                  <input
                    type="text"
                    value={settingsForm.owner_name}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, owner_name: e.target.value })
                    }
                    placeholder="Ej. Jeancarlos José Huertas Quichca"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Nombre oficial que ven los compradores al transferir por Yape, Plin o BCP.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Número de Yape */}
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                      <span>Número de Yape (9 dígitos)</span>
                      <span className="text-[10px] text-purple-400 font-bold">Billetera BCP</span>
                    </label>
                    <input
                      type="text"
                      maxLength={9}
                      value={settingsForm.yape_number}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          yape_number: e.target.value.replace(/\D/g, ''),
                        })
                      }
                      placeholder="924046690"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  {/* Número de Plin */}
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                      <span>Número de Plin (9 dígitos)</span>
                      <span className="text-[10px] text-sky-400 font-bold">Interbank/BBVA/Scotiabank</span>
                    </label>
                    <input
                      type="text"
                      maxLength={9}
                      value={settingsForm.plin_number}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          plin_number: e.target.value.replace(/\D/g, ''),
                        })
                      }
                      placeholder="983064501"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>
                </div>

                {/* Banco Oficial */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Banco de la Cuenta Principal
                  </label>
                  <input
                    type="text"
                    value={settingsForm.bank_name}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, bank_name: e.target.value })
                    }
                    placeholder="BCP - Banco de Crédito del Perú"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Número de Cuenta Bancaria en Soles */}
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">
                      Número de Cuenta en Soles (BCP)
                    </label>
                    <input
                      type="text"
                      value={settingsForm.bank_account_soles}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          bank_account_soles: e.target.value.replace(/\D/g, ''),
                        })
                      }
                      placeholder="22079349234041"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>

                  {/* Código de Cuenta Interbancario (CCI) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">
                      Código Interbancario CCI (20 dígitos)
                    </label>
                    <input
                      type="text"
                      maxLength={20}
                      value={settingsForm.bank_cci}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          bank_cci: e.target.value.replace(/\D/g, ''),
                        })
                      }
                      placeholder="00222017934923404128"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                </div>

                {/* WhatsApp para Notificaciones */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                    <span>WhatsApp de Soporte y Notificaciones (9 dígitos)</span>
                    <span className="text-[10px] text-emerald-400 font-bold">Perú (+51)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={9}
                    value={settingsForm.whatsapp_notification}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        whatsapp_notification: e.target.value.replace(/\D/g, ''),
                      })
                    }
                    placeholder="983064501"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white font-black py-3.5 px-6 rounded-2xl text-sm transition-all shadow-xl shadow-orange-600/30 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Guardar Configuración de Cobro</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: AUDITORÍA Y VERIFICACIÓN DE VOUCHER */}
      {/* ========================================================================= */}
      {selectedVoucherOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5">
            <button
              onClick={() => setSelectedVoucherOrder(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  Auditoría de Comprobante de Pago
                </h3>
                <p className="text-xs text-orange-400 font-mono">
                  {selectedVoucherOrder.order_code} • {selectedVoucherOrder.customer_name}
                </p>
              </div>
            </div>

            {/* Datos de Transferencia y Cuenta Receptora del Dueño */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Monto del Pedido:</span>
                <span className="text-base font-black text-white">
                  S/ {Number(selectedVoucherOrder.total).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Método Utilizado:</span>
                <span className="font-bold text-orange-400">
                  {selectedVoucherOrder.payment?.method || 'Yape'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">N° de Operación Bancaria:</span>
                <span className="font-mono font-bold text-amber-300">
                  {selectedVoucherOrder.payment?.operation_number || 'N/A'}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                <span className="text-slate-400">Cuenta Destino Auditada:</span>
                <span className="font-semibold text-slate-200 text-[11px]">
                  {selectedVoucherOrder.payment?.destination_account || 'Cuenta del Propietario'}
                </span>
              </div>
            </div>

            {/* Visualización de la Captura del Voucher en Alta Resolución */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 block">
                Captura de Pantalla del Comprobante:
              </span>
              <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800 flex justify-center items-center max-h-72 overflow-hidden">
                {selectedVoucherOrder.payment?.voucher_image ? (
                  <img
                    src={selectedVoucherOrder.payment.voucher_image}
                    alt="Voucher de Pago"
                    className="max-h-64 object-contain rounded-xl border border-slate-800 shadow-md"
                  />
                ) : (
                  <div className="py-12 text-center text-slate-500 space-y-2">
                    <CreditCard className="w-10 h-10 mx-auto text-slate-600" />
                    <p className="text-xs">
                      {selectedVoucherOrder.payment?.method === 'Tarjeta'
                        ? 'Pago procesado vía Pasarela de Tarjeta (Código Auth: ' + (selectedVoucherOrder.payment.auth_code || 'AUTH-OK') + ')'
                        : 'No se adjuntó captura de voucher físico'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Selector de Despacho y Botones de Aprobación */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-semibold">Avanzar Despacho:</span>
                <select
                  value={selectedVoucherOrder.order_status}
                  onChange={(e) =>
                    handleUpdateOrderStatus(selectedVoucherOrder.id, e.target.value)
                  }
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-orange-500"
                >
                  <option value="En Verificación">En Verificación</option>
                  <option value="Pagado / En Preparación">Pagado / En Preparación</option>
                  <option value="Enviado">Enviado (Olva / Shalom)</option>
                  <option value="Entregado">Entregado al Cliente</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleUpdatePaymentStatus(selectedVoucherOrder.id, 'Aprobado')}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3 px-4 rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aprobar Abono en Mi Cuenta</span>
                </button>

                <button
                  onClick={() => handleUpdatePaymentStatus(selectedVoucherOrder.id, 'Rechazado')}
                  className="bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Rechazar Comprobante (Revertir Stock)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREACIÓN / EDICIÓN DE PRODUCTO */}
      {/* ========================================================================= */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <button
              onClick={() => setProductModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-600/20 text-orange-400 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  {editingProduct ? 'Editar Producto y Precio' : 'Crear Nuevo Producto'}
                </h3>
                <p className="text-xs text-slate-400">
                  Actualización en caliente en SQLite y catálogo público
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre del Suplemento / Accesorio
                </label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Ej. Pre-Entreno C4 Extreme 30 Serv"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Categoría
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Proteínas">Proteínas</option>
                    <option value="Creatinas">Creatinas</option>
                    <option value="Pre-Entrenos">Pre-Entrenos</option>
                    <option value="Accesorios">Accesorios</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Precio en Soles (S/)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    min="1"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="149.90"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Stock en Unidades
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    placeholder="20"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    ≤ 5 unidades dispara alerta de Bajo Stock
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <label className="relative flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(productForm.featured)}
                      onChange={(e) =>
                        setProductForm({ ...productForm, featured: e.target.checked ? 1 : 0 })
                      }
                      className="rounded border-slate-700 text-orange-600 focus:ring-orange-500 w-4 h-4 bg-slate-950"
                    />
                    <span>Producto Destacado en Tienda</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descripción
                </label>
                <textarea
                  rows="2"
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm({ ...productForm, description: e.target.value })
                  }
                  placeholder="Beneficios, ingredientes y dosificación..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  URL de Imagen (o selecciona una foto fitness)
                </label>
                <input
                  type="url"
                  value={productForm.image_url}
                  onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono mb-2"
                  required
                />
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_FITNESS_IMAGES.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setProductForm({ ...productForm, image_url: img.url })}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-1 rounded-md border border-slate-700 transition-all"
                    >
                      {img.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-lg shadow-orange-600/20"
                >
                  {editingProduct ? 'Guardar Cambios de Producto' : 'Crear Producto en Catálogo'}
                </button>
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONFIRMACIÓN DE ELIMINACIÓN DE PRODUCTO */}
      {/* ========================================================================= */}
      {deleteProductConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white">¿Eliminar Producto del Catálogo?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Estás a punto de eliminar <strong className="text-white">"{deleteProductConfirm.name}"</strong>. El producto dejará de ser visible en la tienda, pero los pedidos históricos mantendrán sus detalles intactos.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleDeleteProduct}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-lg shadow-rose-600/20"
              >
                Sí, Eliminar Producto
              </button>
              <button
                onClick={() => setDeleteProductConfirm(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CREACIÓN / EDICIÓN DE CLIENTE */}
      {/* ========================================================================= */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setUserModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  {editingUser ? 'Editar Datos del Cliente' : 'Registrar Nuevo Cliente'}
                </h3>
                <p className="text-xs text-slate-400">
                  Validación peruana: DNI 8 dígitos y Celular 9 dígitos
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Ej. Carlos Mendoza Ríos"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    DNI (8 dígitos)
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    value={userForm.dni}
                    onChange={(e) =>
                      setUserForm({ ...userForm, dni: e.target.value.replace(/\D/g, '') })
                    }
                    placeholder="72458912"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Celular (9 dígitos)
                  </label>
                  <input
                    type="text"
                    maxLength={9}
                    value={userForm.phone}
                    onChange={(e) =>
                      setUserForm({ ...userForm, phone: e.target.value.replace(/\D/g, '') })
                    }
                    placeholder="987654321"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="carlos.mendoza@gmail.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Dirección de Entrega
                </label>
                <input
                  type="text"
                  value={userForm.address}
                  onChange={(e) => setUserForm({ ...userForm, address: e.target.value })}
                  placeholder="Av. Arequipa 2450, Dpto 402, Miraflores"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={userForm.city}
                  onChange={(e) => setUserForm({ ...userForm, city: e.target.value })}
                  placeholder="Lima"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-lg shadow-orange-600/20"
                >
                  {editingUser ? 'Guardar Cambios' : 'Registrar Cliente'}
                </button>
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


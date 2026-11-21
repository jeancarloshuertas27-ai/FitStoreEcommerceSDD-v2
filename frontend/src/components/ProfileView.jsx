import React, { useState, useEffect } from 'react';
import {
  User,
  ShoppingBag,
  Save,
  UserPlus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Calendar,
  Clock,
  Eye,
  LogIn,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useUser } from '../context/UserContext.jsx';
import api from '../services/api.js';
import ElectronicReceipt from './ElectronicReceipt.jsx';

export default function ProfileView({ onOpenAuth }) {
  const { currentUser, logout, updateCurrentUser } = useUser();

  const [activeSubTab, setActiveSubTab] = useState('data'); // 'data' | 'orders'
  const [formData, setFormData] = useState({
    name: '',
    dni: '',
    email: '',
    phone: '',
    address: '',
    city: '',
  });

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);

  // Sincronizar datos del formulario con el usuario actual
  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        dni: currentUser.dni || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        address: currentUser.address || '',
        city: currentUser.city || '',
      });
      loadUserOrders(currentUser.id);
    } else {
      setOrders([]);
    }
  }, [currentUser]);

  const loadUserOrders = async (userId) => {
    try {
      setLoadingOrders(true);
      const data = await api.getUserOrders(userId);
      setOrders(data);
    } catch (err) {
      console.error('Error al cargar órdenes:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveStatus({ type: '', message: '' });

    // Validación DNI (8 dígitos)
    if (!/^\d{8}$/.test(formData.dni)) {
      setSaveStatus({ type: 'error', message: 'El DNI debe contener exactamente 8 dígitos numéricos.' });
      return;
    }

    // Validación Celular (9 dígitos)
    if (!/^\d{9}$/.test(formData.phone)) {
      setSaveStatus({ type: 'error', message: 'El celular debe contener exactamente 9 dígitos numéricos.' });
      return;
    }

    try {
      await updateCurrentUser(formData);
      setSaveStatus({ type: 'success', message: '¡Datos personales actualizados correctamente!' });
      setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000);
    } catch (err) {
      setSaveStatus({ type: 'error', message: err.message || 'Error al guardar cambios' });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pagado / En Preparación':
      case 'Aprobado':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'En Verificación':
      case 'Pendiente de Verificación':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Pendiente de Pago':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'Cancelado':
      case 'Rechazado':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fadeIn">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center mx-auto">
            <User className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white">Inicia sesión para ver tu perfil</h1>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Accede a tus datos de despacho, historial de compras y boletas electrónicas en FitStore Pro.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-bold text-white transition-all"
            >
              <LogIn className="w-4 h-4 text-orange-400" />
              <span>Iniciar Sesión</span>
            </button>
            <button
              onClick={() => onOpenAuth && onOpenAuth('register')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-sm font-bold text-white shadow-lg shadow-orange-600/25 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Crear Cuenta</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Top Header & Customer Account Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-orange-500 text-xs font-bold uppercase tracking-wider">
            Cuenta del Cliente
          </span>
          <h1 className="text-2xl font-black text-white mt-0.5">
            Mi Perfil y Mis Pedidos
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Datos personales de entrega e historial completo de compras y boletas electrónicas.
          </p>
        </div>

        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-orange-600/20 border border-orange-500/30 text-orange-400 flex items-center justify-center font-black text-sm">
              {(currentUser.name || 'C').charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="block text-xs font-bold text-white">{currentUser.name}</span>
              <span className="block text-[11px] text-slate-400">
                DNI: {currentUser.dni} • {currentUser.email}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-rose-500/15 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 text-xs font-bold px-3 py-2 rounded-lg transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 mb-6 gap-2">
        <button
          onClick={() => setActiveSubTab('data')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeSubTab === 'data'
              ? 'border-orange-500 text-orange-400 bg-slate-900/40 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Datos Personales y Envío</span>
        </button>

        <button
          onClick={() => setActiveSubTab('orders')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeSubTab === 'orders'
              ? 'border-orange-500 text-orange-400 bg-slate-900/40 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Historial de Pedidos ({orders.length})</span>
        </button>
      </div>

      {/* Tab 1: Personal Data Form */}
      {activeSubTab === 'data' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl max-w-3xl">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Información del Cliente y Despacho</h2>
            <p className="text-xs text-slate-400">
              Estos datos se utilizan para la emisión de comprobantes y la entrega de tus suplementos en Lima o Provincias.
            </p>
          </div>

          {saveStatus.message && (
            <div
              className={`p-4 rounded-xl mb-6 text-xs font-semibold flex items-center gap-3 border ${
                saveStatus.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              }`}
            >
              {saveStatus.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              )}
              <span>{saveStatus.message}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Documento Nacional de Identidad (DNI - 8 dígitos)
                </label>
                <input
                  type="text"
                  name="dni"
                  value={formData.dni}
                  onChange={handleInputChange}
                  maxLength={8}
                  placeholder="8 dígitos numéricos"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Celular de Contacto (9 dígitos)
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  maxLength={9}
                  placeholder="9 dígitos numéricos"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Dirección de Entrega
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Av, Calle, Número, Dpto / Interior"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Ciudad / Distrito
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Rol del Usuario
                </label>
                <input
                  type="text"
                  value={currentUser?.role === 'admin' ? 'Administrador Oficial' : 'Cliente Registrado'}
                  disabled
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-400 cursor-not-allowed font-medium"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg shadow-orange-600/30 transition-all hover:scale-[1.02]"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Cambios en SQLite</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Orders History */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4">
          {loadingOrders ? (
            <div className="bg-slate-900 rounded-2xl p-12 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-orange-500" />
              <p className="text-sm font-semibold">Cargando historial de pedidos...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-slate-900 rounded-2xl p-12 text-center border border-slate-800">
              <ShoppingBag className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-200">No tienes pedidos registrados</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Los pedidos que realices con Yape, Plin o Transferencia aparecerán aquí con el detalle de la cuenta receptora.
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4"
              >
                {/* Order Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-white text-sm bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                      {order.order_code}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {order.created_at}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusBadge(
                        order.order_status
                      )}`}
                    >
                      {order.order_status}
                    </span>
                  </div>
                </div>

                {/* Products in this order */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-400">Productos del Pedido:</div>
                  <div className="divide-y divide-slate-800/50 bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
                    {order.items?.map((item) => (
                      <div key={item.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                        <span className="text-slate-200 font-medium">
                          {item.quantity}x {item.product_name}
                        </span>
                        <span className="text-orange-400 font-bold">
                          S/ {item.subtotal?.toFixed(2) || (item.quantity * item.unit_price).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment & Authorization info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5 font-medium">Método de Pago:</span>
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-orange-400" />
                      {order.payment?.method || 'Pasarela FitStore Pro'}
                    </span>
                    {order.payment?.operation_number && (
                      <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                        N° Op: {order.payment.operation_number}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5 font-medium">Validación de Pasarela:</span>
                    <span className="font-semibold text-emerald-300 flex items-center gap-1.5 text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      {order.payment?.payment_status || 'Procesado'}
                      {order.payment?.auth_code ? ` • ${order.payment.auth_code}` : ''}
                    </span>
                  </div>
                </div>

                {/* Bottom Total Bar con Botón Ver Boleta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 gap-2">
                  <span className="text-xs text-slate-400">
                    Dirección de Envío: <strong className="text-slate-300 font-normal">{order.shipping_address}</strong>
                  </span>
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedReceiptOrder(order)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-orange-400 border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Boleta</span>
                    </button>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 mr-2">Total Pagado:</span>
                      <span className="text-base font-black text-white">
                        <span className="text-orange-500 text-xs mr-0.5">S/</span>
                        {order.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Boleta Electrónica */}
      {selectedReceiptOrder && (
        <ElectronicReceipt
          order={selectedReceiptOrder}
          onClose={() => setSelectedReceiptOrder(null)}
          onOrderUpdated={(updatedOrder) => {
            setSelectedReceiptOrder(updatedOrder);
            if (currentUser?.id) loadUserOrders(currentUser.id);
          }}
          onGoToOrders={() => setSelectedReceiptOrder(null)}
          onContinueShopping={() => setSelectedReceiptOrder(null)}
        />
      )}
    </div>
  );
}


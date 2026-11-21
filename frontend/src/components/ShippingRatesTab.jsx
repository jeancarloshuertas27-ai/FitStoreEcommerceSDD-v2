import React, { useEffect, useState } from 'react';
import { Truck, Plus, Edit2, Trash2, Save, X, Loader2, AlertTriangle } from 'lucide-react';
import api from '../services/api.js';

const EMPTY_FORM = { department: '', province: '', cost: '', delivery_days: '', active: 1 };

/**
 * Pestaña del Panel Admin: gestión de tarifas de envío por departamento/provincia (shipping_rates).
 */
export default function ShippingRatesTab() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setRates(await api.getAdminShippingRates());
      setError('');
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las tarifas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError('');
  };

  const openEdit = (rate) => {
    setEditingId(rate.id);
    setForm({
      department: rate.department,
      province: rate.province,
      cost: String(rate.cost),
      delivery_days: rate.delivery_days,
      active: rate.active,
    });
    setShowForm(true);
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    const cost = Number(form.cost);
    if (!form.department.trim() || !form.province.trim()) {
      setError('Departamento y provincia son obligatorios.');
      return;
    }
    if (form.cost === '' || !Number.isFinite(cost) || cost < 0) {
      setError('El costo debe ser un monto en Soles (S/) mayor o igual a cero.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, cost };
      if (editingId) await api.updateShippingRate(editingId, payload);
      else await api.createShippingRate(payload);
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message || 'No se pudo guardar la tarifa.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (rate) => {
    try {
      await api.updateShippingRate(rate.id, { active: rate.active ? 0 : 1 });
      await load();
    } catch (err) {
      setError(err.message || 'No se pudo cambiar el estado.');
    }
  };

  const handleDelete = async (rate) => {
    if (!window.confirm(`¿Eliminar la tarifa ${rate.department} - ${rate.province}?`)) return;
    try {
      await api.deleteShippingRate(rate.id);
      await load();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la tarifa.');
    }
  };

  const inputCls =
    'w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500';

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-600/20 text-orange-400 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Tarifas de Envío por Provincia</h2>
            <p className="text-xs text-slate-400">
              Costos en Soles (S/) que el cliente verá y pagará en el Checkout (tabla{' '}
              <code className="text-orange-400">shipping_rates</code>).
            </p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nueva Tarifa
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Departamento *</label>
            <input className={inputCls} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Arequipa" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Provincia *</label>
            <input className={inputCls} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} placeholder="Arequipa Ciudad" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Costo (S/) *</label>
            <input className={inputCls} type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="15.00" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Plazo de entrega</label>
            <input className={inputCls} value={form.delivery_days} onChange={(e) => setForm({ ...form, delivery_days: e.target.value })} placeholder="2 a 4 días hábiles" />
          </div>
          <div className="sm:col-span-4 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={!!form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked ? 1 : 0 })}
              />
              Tarifa activa (visible en el Checkout)
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" /> Cancelar
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {editingId ? 'Guardar cambios' : 'Crear tarifa'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[11px]">
            <tr>
              <th className="py-3 px-4">Departamento</th>
              <th className="py-3 px-4">Provincia</th>
              <th className="py-3 px-4 text-right">Costo</th>
              <th className="py-3 px-4">Entrega</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {loading && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Cargando tarifas…
                </td>
              </tr>
            )}
            {!loading && rates.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No hay tarifas registradas. Los clientes no podrán finalizar compras hasta crear una.
                </td>
              </tr>
            )}
            {rates.map((r) => (
              <tr key={r.id} className="hover:bg-slate-800/30">
                <td className="py-3 px-4 text-white font-semibold">{r.department}</td>
                <td className="py-3 px-4 text-slate-200">{r.province}</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-orange-400">S/ {Number(r.cost).toFixed(2)}</td>
                <td className="py-3 px-4 text-slate-400">{r.delivery_days}</td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => toggleActive(r)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                      r.active
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                    title="Activar / desactivar"
                  >
                    {r.active ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="py-3 px-4 text-right">
                  <button onClick={() => openEdit(r)} className="p-2 rounded-lg text-slate-300 hover:bg-slate-800" title="Editar">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(r)} className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

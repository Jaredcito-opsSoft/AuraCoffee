import React, { useState, useEffect } from 'react';
import {
  Boxes,
  AlertTriangle,
  PlusCircle,
  TrendingDown,
  History,
  X,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../lib/api';

interface InventoryItem {
  id: number;
  name: string;
  sku?: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  costPerUnitCents: number;
  status: 'critical' | 'warning' | 'optimal';
}

interface KardexMovement {
  id: number;
  movementType: string;
  quantity: string | number;
  stockBefore: string | number;
  stockAfter: string | number;
  reason?: string;
  createdAt: string;
  inventoryItem: {
    name: string;
    unit: string;
  };
  createdBy?: {
    name: string;
  };
}

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stock' | 'kardex'>('stock');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<KardexMovement[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [showEntryModal, setShowEntryModal] = useState<boolean>(false);
  const [showWasteModal, setShowWasteModal] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Form states
  const [qtyInput, setQtyInput] = useState<number>(0);
  const [reasonInput, setReasonInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [categoryFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const itemsData = await api.get<InventoryItem[]>(
        `/inventory/items${categoryFilter !== 'all' ? `?category=${categoryFilter}` : ''}`
      );
      setItems(itemsData);

      const movementsData = await api.get<KardexMovement[]>('/inventory/movements?limit=50');
      setMovements(movementsData);
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || qtyInput <= 0) return;
    try {
      setIsSubmitting(true);
      await api.post(`/inventory/items/${selectedItem.id}/entry`, {
        quantity: qtyInput,
        reason: reasonInput.trim() || 'Entrada manual de insumos',
      });
      setShowEntryModal(false);
      setQtyInput(0);
      setReasonInput('');
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || qtyInput <= 0) return;
    try {
      setIsSubmitting(true);
      await api.post(`/inventory/items/${selectedItem.id}/waste`, {
        quantity: qtyInput,
        reason: reasonInput.trim() || 'Merma operativa',
      });
      setShowWasteModal(false);
      setQtyInput(0);
      setReasonInput('');
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.sku && i.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const criticalCount = items.filter((i) => i.status === 'critical').length;
  const warningCount = items.filter((i) => i.status === 'warning').length;

  return (
    <div className="space-y-5 select-none">
      {/* Header & KPI Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#FDF8F0]">
            Control de Insumos & Kardex
          </h1>
          <p className="text-xs text-stone-400">
            Seguimiento de stock de café, leches, jarabes y descartables con descuento por receta (BOM)
          </p>
        </div>

        {/* Quick Stock Status Pills */}
        <div className="flex gap-2">
          <div className="px-3 py-1.5 bg-red-950/30 border border-red-800/40 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-semibold text-red-300">
              {criticalCount} Críticos (Agotados/Bajo Mínimo)
            </span>
          </div>
          <div className="px-3 py-1.5 bg-amber-950/30 border border-amber-800/40 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs font-semibold text-amber-300">{warningCount} En Alerta</span>
          </div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#14100B] border border-[#2A2016] rounded-2xl">
        <div className="flex gap-1.5">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'stock'
                ? 'bg-amber-500 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Boxes size={14} />
            <span>Semáforo de Existencias</span>
          </button>
          <button
            onClick={() => setActiveTab('kardex')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'kardex'
                ? 'bg-amber-500 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <History size={14} />
            <span>Kardex de Movimientos</span>
          </button>
        </div>

        {activeTab === 'stock' && (
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar insumo o código..."
                className="bg-[#100C08] border border-[#2E2419] rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#100C08] border border-[#2E2419] rounded-xl px-3 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Todas las categorías</option>
              <option value="coffee_beans">Granos de Café</option>
              <option value="dairy">Leches & Bebidas Veganas</option>
              <option value="syrups">Jarabes & Saborizantes</option>
              <option value="disposables">Vasos & Descartables</option>
              <option value="kitchen_supplies">Cocina & Repostería</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: STOCK TABLE */}
      {activeTab === 'stock' && (
        <div className="bg-[#14100B] border border-[#2A2016] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#18130C] border-b border-[#2A2016] text-stone-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Insumo</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-right">Existencia Actual</th>
                  <th className="py-3 px-4 text-right">Stock Mínimo</th>
                  <th className="py-3 px-4 text-right">Costo Unitario</th>
                  <th className="py-3 px-4 text-center">Acciones Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2016]/60">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#18130C]/50 transition-colors">
                    {/* Status Traffic Light */}
                    <td className="py-3 px-4">
                      {item.status === 'critical' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/60 border border-red-800 text-red-300 text-[10px] font-bold">
                          <AlertTriangle size={11} /> Crítico
                        </span>
                      ) : item.status === 'warning' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-700 text-amber-300 text-[10px] font-bold">
                          Alerta
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-[10px] font-bold">
                          <CheckCircle2 size={11} /> Óptimo
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-stone-100 block">{item.name}</span>
                      {item.sku && <span className="font-mono text-[10px] text-stone-500">{item.sku}</span>}
                    </td>

                    <td className="py-3 px-4 text-stone-400 capitalize">
                      {item.category.replace('_', ' ')}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-100 text-sm">
                      {item.currentStock.toLocaleString('es-MX')} {item.unit}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-stone-400">
                      {item.minimumStock.toLocaleString('es-MX')} {item.unit}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-amber-400">
                      ${(item.costPerUnitCents / 100).toFixed(2)}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItem(item);
                            setQtyInput(0);
                            setReasonInput('');
                            setShowEntryModal(true);
                          }}
                          className="px-2.5 py-1 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800 text-emerald-300 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <PlusCircle size={12} />
                          <span>Entrada</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItem(item);
                            setQtyInput(0);
                            setReasonInput('');
                            setShowWasteModal(true);
                          }}
                          className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-300 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <TrendingDown size={12} />
                          <span>Merma</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: KARDEX MOVEMENTS TABLE */}
      {activeTab === 'kardex' && (
        <div className="bg-[#14100B] border border-[#2A2016] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#18130C] border-b border-[#2A2016] text-stone-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Insumo</th>
                  <th className="py-3 px-4">Tipo Movimiento</th>
                  <th className="py-3 px-4 text-right">Cantidad</th>
                  <th className="py-3 px-4 text-right">Antes</th>
                  <th className="py-3 px-4 text-right">Después</th>
                  <th className="py-3 px-4">Motivo / Referencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2016]/60">
                {movements.map((mov) => {
                  const qty = Number(mov.quantity);
                  const isPositive = qty > 0;
                  return (
                    <tr key={mov.id} className="hover:bg-[#18130C]/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-stone-400">
                        {new Date(mov.createdAt).toLocaleString('es-MX')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-stone-200">
                        {mov.inventoryItem.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-[#20180F] border border-[#2E2419] text-[10px] font-mono text-amber-300">
                          {mov.movementType}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold ${
                          isPositive ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {isPositive ? `+${qty}` : qty} {mov.inventoryItem.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-stone-400">
                        {Number(mov.stockBefore).toLocaleString('es-MX')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-stone-200">
                        {Number(mov.stockAfter).toLocaleString('es-MX')}
                      </td>
                      <td className="py-3 px-4 text-stone-300 text-[11px]">
                        {mov.reason || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STOCK ENTRY MODAL */}
      {showEntryModal && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleRegisterEntry}
            className="w-full max-w-md bg-[#18130C] border border-[#2E2419] rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-100">
                  Entrada de Insumo
                </h3>
                <p className="text-xs text-amber-400 font-semibold">{selectedItem.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEntryModal(false)}
                className="text-stone-400 hover:text-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">
                Cantidad a Ingresar ({selectedItem.unit}):
              </label>
              <input
                type="number"
                step="any"
                required
                value={qtyInput || ''}
                onChange={(e) => setQtyInput(Number(e.target.value))}
                placeholder={`Ej. 1000 ${selectedItem.unit}`}
                className="w-full bg-[#100C08] border border-[#2E2419] rounded-xl px-4 py-2.5 text-sm font-mono text-stone-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">
                Motivo / Proveedor:
              </label>
              <input
                type="text"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="Ej. Compra semanal a proveedor Chiapas"
                className="w-full bg-[#100C08] border border-[#2E2419] rounded-xl px-4 py-2 text-xs text-stone-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || qtyInput <= 0}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-40"
            >
              {isSubmitting ? 'Registrando...' : 'Confirmar Entrada al Kardex'}
            </button>
          </form>
        </div>
      )}

      {/* WASTE / MERMA MODAL */}
      {showWasteModal && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleRegisterWaste}
            className="w-full max-w-md bg-[#18130C] border border-[#2E2419] rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-100">
                  Registrar Merma / Desperdicio
                </h3>
                <p className="text-xs text-red-400 font-semibold">{selectedItem.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowWasteModal(false)}
                className="text-stone-400 hover:text-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">
                Cantidad a Descontar ({selectedItem.unit}):
              </label>
              <input
                type="number"
                step="any"
                required
                value={qtyInput || ''}
                onChange={(e) => setQtyInput(Number(e.target.value))}
                placeholder={`Ej. 200 ${selectedItem.unit}`}
                className="w-full bg-[#100C08] border border-[#2E2419] rounded-xl px-4 py-2.5 text-sm font-mono text-stone-100 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">
                Motivo del Desperdicio (Obligatorio):
              </label>
              <input
                type="text"
                required
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="Ej. Leche cortada, purga de calibración de tolva"
                className="w-full bg-[#100C08] border border-[#2E2419] rounded-xl px-4 py-2 text-xs text-stone-100 focus:outline-none focus:border-red-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || qtyInput <= 0 || !reasonInput}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-stone-100 font-bold rounded-xl text-xs shadow-lg shadow-red-950/50 transition-all disabled:opacity-40"
            >
              {isSubmitting ? 'Registrando...' : 'Registrar Merma en Kardex'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

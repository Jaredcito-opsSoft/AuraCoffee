import React, { useState, useEffect } from 'react';
import {
  Coffee,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  SlidersHorizontal,
  Flame,
} from 'lucide-react';
import { api } from '../../lib/api';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, prods] = await Promise.all([
        api.get<any[]>('/products/categories'),
        api.get<any[]>('/products'),
      ]);
      setCategories(cats);
      setProducts(prods);
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (id: number) => {
    try {
      const updated = await api.patch<any>(`/products/${id}/toggle-availability`);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, isAvailable: updated.isAvailable } : p)));
    } catch (err: any) {
      alert(`Error al cambiar disponibilidad: ${err.message}`);
    }
  };

  const filtered = products.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-5 select-none max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#FDF8F0]">
            Catálogo de Productos & Fichas Técnicas
          </h1>
          <p className="text-xs text-stone-400">
            Administración del menú, precios, tamaños, modificadores y recetas (BOM)
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-[#14100B] border border-[#2A2016] rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-stone-950 font-bold shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === c.id
                  ? 'bg-amber-500 text-stone-950 font-bold shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU..."
            className="bg-[#100C08] border border-[#2E2419] rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-[#14100B] border border-[#2A2016] rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#18130C] border-b border-[#2A2016] text-stone-400 uppercase font-mono text-[10px]">
            <tr>
              <th className="py-3 px-4">Producto</th>
              <th className="py-3 px-4">Categoría</th>
              <th className="py-3 px-4">Estación de Barra</th>
              <th className="py-3 px-4 text-right">Precio Base / Tamaños</th>
              <th className="py-3 px-4">Receta (BOM)</th>
              <th className="py-3 px-4 text-center">Estado / Disponibilidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2016]/60">
            {filtered.map((prod) => (
              <tr key={prod.id} className="hover:bg-[#18130C]/50 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Coffee size={16} />
                    </div>
                    <div>
                      <span className="font-semibold text-stone-100 block text-xs">
                        {prod.name}
                      </span>
                      {prod.sku && <span className="font-mono text-[10px] text-stone-500">{prod.sku}</span>}
                    </div>
                  </div>
                </td>

                <td className="py-3.5 px-4 text-stone-400">
                  {prod.category?.name || 'General'}
                </td>

                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded-md bg-[#20180F] border border-[#2E2419] font-mono text-[10px] text-amber-300 capitalize">
                    {prod.preparationStation.replace('_', ' ')}
                  </span>
                </td>

                <td className="py-3.5 px-4 text-right font-mono">
                  {prod.hasVariants ? (
                    <div>
                      <span className="font-bold text-amber-400">
                        ${(prod.variants[0]?.priceCents / 100).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-stone-500 block">
                        ({prod.variants.length} tamaños)
                      </span>
                    </div>
                  ) : (
                    <span className="font-bold text-amber-400">
                      ${(prod.basePriceCents / 100).toFixed(2)}
                    </span>
                  )}
                </td>

                <td className="py-3.5 px-4">
                  {prod.recipes?.length > 0 ? (
                    <span className="text-[11px] text-emerald-400 font-medium">
                      ✓ Ficha técnica configurada
                    </span>
                  ) : (
                    <span className="text-[11px] text-stone-500 italic">
                      Sin receta asignada
                    </span>
                  )}
                </td>

                <td className="py-3.5 px-4 text-center">
                  <button
                    onClick={() => handleToggleAvailability(prod.id)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-bold border transition-all ${
                      prod.isAvailable
                        ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/60'
                        : 'bg-red-950/40 border-red-800 text-red-300 hover:bg-red-900/60'
                    }`}
                  >
                    {prod.isAvailable ? 'Disponible' : 'Agotado'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

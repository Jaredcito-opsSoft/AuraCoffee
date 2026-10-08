import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Send,
  CreditCard,
  Banknote,
  Smartphone,
  UserCheck,
  CheckCircle2,
  Printer,
  X,
  Coffee,
  Sparkles,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useCartStore, CartItem, CartModifier } from '../../store/cart.store';
import { useAuthStore } from '../../store/auth.store';

interface Category {
  id: number;
  name: string;
  slug: string;
  colorHex?: string;
  iconName?: string;
}

interface ProductVariant {
  id: number;
  name: string;
  priceCents: number;
}

interface Modifier {
  id: number;
  name: string;
  extraPriceCents: number;
}

interface ModifierGroup {
  id: number;
  name: string;
  minSelect: number;
  maxSelect: number;
  modifiers: Modifier[];
}

interface Product {
  id: number;
  categoryId: number;
  name: string;
  description?: string;
  basePriceCents: number;
  hasVariants: boolean;
  isAvailable: boolean;
  preparationStation: string;
  variants: ProductVariant[];
  modifierGroupLinks: Array<{ modifierGroup: ModifierGroup }>;
}

export const PosPage: React.FC = () => {
  const { user, activeCashSession } = useAuthStore();
  const cart = useCartStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Customization Modal State
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<Modifier[]>([]);
  const [itemNotes, setItemNotes] = useState<string>('');

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card_debit' | 'transfer'>('cash');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);

  // Success Ticket Modal State
  const [completedSale, setCompletedSale] = useState<any | null>(null);

  // Customer Loyalty Lookup
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [foundCustomers, setFoundCustomers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, prods] = await Promise.all([
        api.get<Category[]>('/products/categories'),
        api.get<Product[]>('/products'),
      ]);
      setCategories(cats);
      setProducts(prods);
    } catch (err) {
      console.error('Error loading catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    return matchCategory && matchSearch;
  });

  const handleProductClick = (product: Product) => {
    if (!product.isAvailable) return;

    if (product.hasVariants || product.modifierGroupLinks?.length > 0) {
      // Open customization modal
      setModalProduct(product);
      setSelectedVariant(product.variants?.[0] || null);
      setSelectedModifiers([]);
      setItemNotes('');
    } else {
      // Add directly
      cart.addItem({
        productId: product.id,
        productName: product.name,
        unitPriceCents: product.basePriceCents,
      });
    }
  };

  const handleAddCustomizedItem = () => {
    if (!modalProduct) return;

    const unitPriceCents = selectedVariant
      ? selectedVariant.priceCents
      : modalProduct.basePriceCents;

    cart.addItem({
      productId: modalProduct.id,
      productName: modalProduct.name,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      unitPriceCents,
      modifiers: selectedModifiers.map((m) => ({
        id: m.id,
        name: m.name,
        extraPriceCents: m.extraPriceCents,
      })),
      notes: itemNotes.trim() || undefined,
    });

    setModalProduct(null);
  };

  const toggleModifier = (mod: Modifier, group: ModifierGroup) => {
    const exists = selectedModifiers.some((m) => m.id === mod.id);
    if (exists) {
      setSelectedModifiers((prev) => prev.filter((m) => m.id !== mod.id));
    } else {
      if (group.maxSelect === 1) {
        // Replace modifiers from this group
        const groupModIds = group.modifiers.map((m) => m.id);
        const filtered = selectedModifiers.filter((m) => !groupModIds.includes(m.id));
        setSelectedModifiers([...filtered, mod]);
      } else {
        setSelectedModifiers((prev) => [...prev, mod]);
      }
    }
  };

  // Search Loyalty Customers
  const handleSearchCustomers = async (query: string) => {
    setCustomerSearch(query);
    if (query.trim().length >= 3) {
      try {
        const res = await api.get<any[]>(`/customers/search?q=${encodeURIComponent(query)}`);
        setFoundCustomers(res);
      } catch {
        setFoundCustomers([]);
      }
    } else {
      setFoundCustomers([]);
    }
  };

  // Send Order to Kitchen/Barista (Comanda)
  const handleSendToKds = async () => {
    if (cart.items.length === 0) return;

    try {
      const payload = {
        orderType: cart.orderType,
        tableId: cart.orderType === 'dine_in' ? cart.tableId || 1 : null,
        customerName: cart.customerName || (cart.customer ? cart.customer.name : 'Cliente'),
        items: cart.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          notes: i.notes,
          modifierIds: i.modifiers.map((m) => m.id),
        })),
      };

      const order = await api.post<any>('/orders', payload);
      alert(`✨ Comanda ${order.folio} enviada con éxito a barra/cocina.`);
      cart.clearCart();
    } catch (err: any) {
      alert(`Error al enviar comanda: ${err.message}`);
    }
  };

  // Process Direct Checkout
  const handleOpenCheckout = () => {
    if (cart.items.length === 0) return;
    const total = cart.getTotalCents() / 100;
    setCashTendered(Math.ceil(total));
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    try {
      setIsProcessingPayment(true);
      const totalCents = cart.getTotalCents();
      const amountPaidCents =
        paymentMethod === 'cash' ? Math.round(cashTendered * 100) : totalCents;

      // 1. Create order first to deduct inventory & sync KDS
      const orderPayload = {
        orderType: cart.orderType,
        tableId: cart.orderType === 'dine_in' ? cart.tableId || 1 : null,
        customerName: cart.customerName || (cart.customer ? cart.customer.name : 'Venta Rápida'),
        items: cart.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          notes: i.notes,
          modifierIds: i.modifiers.map((m) => m.id),
        })),
      };
      const order = await api.post<any>('/orders', orderPayload);

      // 2. Process sale payment
      const salePayload = {
        orderId: order.id,
        customerId: cart.customer?.id || null,
        customerName: orderPayload.customerName,
        subtotalCents: cart.getSubtotalCents(),
        discountCents: cart.discountCents,
        tipCents: cart.tipCents,
        payments: [
          {
            paymentMethod,
            amountCents: amountPaidCents,
            tipPortionCents: cart.tipCents,
          },
        ],
      };

      const sale = await api.post<any>('/sales', salePayload);
      setCompletedSale(sale);
      setShowPaymentModal(false);
      cart.clearCart();
    } catch (err: any) {
      alert(`Error al procesar cobro: ${err.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const totalCents = cart.getTotalCents();
  const changeCents = Math.max(0, Math.round(cashTendered * 100) - totalCents);

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4 select-none">
      {/* LEFT / CENTER: MENU & PRODUCT CATALOG */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#14100B] border border-[#2A2016] rounded-2xl overflow-hidden">
        {/* Category Tabs & Search Bar */}
        <div className="p-4 border-b border-[#2A2016] space-y-3 bg-[#18130C]">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar café, postre, panini o insumo..."
                className="w-full bg-[#100C08] border border-[#2E2419] rounded-xl pl-10 pr-4 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Categories Horizontal Carousel */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-950/40'
                  : 'bg-[#20180F] text-stone-300 hover:bg-[#2A2016] border border-[#34271A]'
              }`}
            >
              Todos los Productos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-950/40'
                    : 'bg-[#20180F] text-stone-300 hover:bg-[#2A2016] border border-[#34271A]'
                }`}
              >
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-stone-400 text-sm">
              Cargando catálogo artesanal...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-stone-500 text-sm">
              <Coffee size={32} className="mb-2 opacity-50" />
              <span>No se encontraron productos en esta categoría</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const displayPrice = product.hasVariants && product.variants?.length
                  ? product.variants[0].priceCents
                  : product.basePriceCents;

                return (
                  <button
                    key={product.id}
                    disabled={!product.isAvailable}
                    onClick={() => handleProductClick(product)}
                    className={`group relative text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between h-36 ${
                      product.isAvailable
                        ? 'bg-[#18130C] border-[#2E2419] hover:border-amber-500/60 hover:bg-[#20180F] hover:shadow-lg hover:shadow-black/60 active:scale-[0.98]'
                        : 'bg-[#120E0A] border-[#221A12] opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <h3 className="font-semibold text-sm text-[#FDF8F0] line-clamp-2 leading-tight group-hover:text-amber-300 transition-colors">
                          {product.name}
                        </h3>
                      </div>
                      {product.description && (
                        <p className="text-[11px] text-stone-400 line-clamp-2 leading-snug">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-end justify-between mt-2 pt-2 border-t border-[#2A2016]/50">
                      <div>
                        <span className="text-[10px] text-stone-500 uppercase font-mono block">
                          {product.hasVariants ? 'Desde' : 'Precio'}
                        </span>
                        <span className="font-mono text-sm font-bold text-amber-400">
                          ${(displayPrice / 100).toFixed(2)}
                        </span>
                      </div>

                      {product.hasVariants ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-medium">
                          {product.variants.length} tamaños
                        </span>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-[#2A2016] group-hover:bg-amber-500 group-hover:text-stone-950 flex items-center justify-center text-stone-300 transition-colors">
                          <Plus size={15} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: TICKET / COMANDA CART PANEL */}
      <div className="w-96 bg-[#14100B] border border-[#2A2016] rounded-2xl flex flex-col overflow-hidden shrink-0">
        {/* Order Header / Dine In vs Takeaway */}
        <div className="p-3.5 border-b border-[#2A2016] bg-[#18130C] space-y-2.5">
          <div className="grid grid-cols-2 p-1 bg-[#100C08] rounded-xl border border-[#2A2016]">
            <button
              onClick={() => cart.setOrderType('takeaway')}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                cart.orderType === 'takeaway'
                  ? 'bg-amber-500 text-stone-950 shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Para Llevar
            </button>
            <button
              onClick={() => cart.setOrderType('dine_in')}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                cart.orderType === 'dine_in'
                  ? 'bg-amber-500 text-stone-950 shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              En Mesa
            </button>
          </div>

          {/* Dine In Mesa selector vs Takeaway Name */}
          {cart.orderType === 'dine_in' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 font-medium">Mesa:</span>
              <select
                value={cart.tableId || 1}
                onChange={(e) => cart.setTable(Number(e.target.value), `Mesa ${e.target.value}`)}
                className="flex-1 bg-[#100C08] border border-[#2E2419] rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              >
                <option value={1}>M-01 (Salón Principal)</option>
                <option value={2}>M-02 (Salón Principal)</option>
                <option value={3}>M-03 (Salón Principal)</option>
                <option value={4}>T-01 (Terraza Jardín)</option>
                <option value={5}>BAR-1 (Barra Alta)</option>
              </select>
            </div>
          ) : (
            <input
              type="text"
              value={cart.customerName}
              onChange={(e) => cart.setCustomerName(e.target.value)}
              placeholder="Nombre del cliente para vocear..."
              className="w-full bg-[#100C08] border border-[#2E2419] rounded-lg px-3 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
          )}

          {/* Loyalty Customer Bar */}
          <div className="relative">
            {cart.customer ? (
              <div className="flex items-center justify-between p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs">
                <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                  <UserCheck size={14} />
                  <span>{cart.customer.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-amber-400 font-bold">
                    {cart.customer.loyaltyPoints} pts
                  </span>
                  <button
                    onClick={() => cart.setCustomer(null)}
                    className="text-stone-400 hover:text-red-400"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => handleSearchCustomers(e.target.value)}
                  placeholder="Fidelización: buscar por teléfono o nombre..."
                  className="w-full bg-[#100C08] border border-[#2A2016] rounded-lg px-3 py-1.5 text-xs text-stone-300 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
                {foundCustomers.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-[#18130C] border border-[#2E2419] rounded-lg shadow-xl overflow-hidden max-h-36 overflow-y-auto">
                    {foundCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          cart.setCustomer(c);
                          setFoundCustomers([]);
                          setCustomerSearch('');
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-amber-500/20 text-xs flex justify-between border-b border-[#2A2016] last:border-none"
                      >
                        <span className="font-medium text-stone-200">{c.name}</span>
                        <span className="font-mono text-amber-400">{c.loyaltyPoints} pts</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-500 text-xs text-center p-4">
              <Coffee size={36} className="mb-2 opacity-30 text-amber-400" />
              <span>La orden está vacía. Selecciona un producto para comenzar.</span>
            </div>
          ) : (
            cart.items.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-[#18130C] border border-[#2E2419] space-y-1.5"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-xs font-semibold text-stone-200 block">
                      {item.productName}
                    </span>
                    {item.variantName && (
                      <span className="text-[11px] text-amber-400 font-medium">
                        {item.variantName}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs font-bold text-stone-100">
                    ${(item.subtotalCents / 100).toFixed(2)}
                  </span>
                </div>

                {/* Modifiers List */}
                {item.modifiers.length > 0 && (
                  <div className="text-[10px] text-stone-400 space-y-0.5">
                    {item.modifiers.map((m) => (
                      <div key={m.id} className="flex justify-between">
                        <span>+ {m.name}</span>
                        {m.extraPriceCents > 0 && (
                          <span className="font-mono text-amber-400/80">
                            +${(m.extraPriceCents / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {item.notes && (
                  <p className="text-[10px] text-amber-300/80 italic bg-[#100C08] p-1 rounded">
                    Nota: "{item.notes}"
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-[#2A2016]/40">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => cart.updateQuantity(item.id, -1)}
                      className="w-6 h-6 rounded-md bg-[#20180F] hover:bg-[#2E2419] text-stone-300 flex items-center justify-center border border-[#34271A]"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="font-mono text-xs font-bold text-stone-100 w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => cart.updateQuantity(item.id, 1)}
                      className="w-6 h-6 rounded-md bg-[#20180F] hover:bg-[#2E2419] text-stone-300 flex items-center justify-center border border-[#34271A]"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <button
                    onClick={() => cart.removeItem(item.id)}
                    className="text-stone-500 hover:text-red-400 p-1 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Bottom Action Buttons */}
        <div className="p-4 border-t border-[#2A2016] bg-[#18130C] space-y-3">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-stone-400">
              <span>Subtotal:</span>
              <span className="font-mono">${(cart.getSubtotalCents() / 100).toFixed(2)}</span>
            </div>
            {cart.tipCents > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Propina:</span>
                <span className="font-mono">+${(cart.tipCents / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-[#FDF8F0] pt-1 border-t border-[#2A2016]">
              <span>Total a Pagar:</span>
              <span className="font-mono text-amber-400 text-lg">
                ${(cart.getTotalCents() / 100).toFixed(2)} MXN
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              disabled={cart.items.length === 0}
              onClick={handleSendToKds}
              className="py-2.5 px-3 rounded-xl bg-[#20180F] hover:bg-amber-500/20 active:scale-95 border border-amber-600/40 text-amber-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
            >
              <Send size={14} />
              <span>A Barra (KDS)</span>
            </button>

            <button
              disabled={cart.items.length === 0}
              onClick={handleOpenCheckout}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/50 transition-all disabled:opacity-40"
            >
              <CreditCard size={14} />
              <span>Cobrar Orden</span>
            </button>
          </div>
        </div>
      </div>

      {/* CUSTOMIZATION MODAL */}
      {modalProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#18130C] border border-[#2E2419] rounded-3xl p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#FDF8F0]">
                  {modalProduct.name}
                </h2>
                <p className="text-xs text-stone-400">{modalProduct.description}</p>
              </div>
              <button
                onClick={() => setModalProduct(null)}
                className="text-stone-400 hover:text-stone-100 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Variants Selector */}
            {modalProduct.hasVariants && modalProduct.variants?.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider block mb-2">
                  Tamaño / Presentación
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {modalProduct.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`p-3 rounded-xl border text-left flex justify-between items-center transition-all ${
                        selectedVariant?.id === v.id
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-semibold'
                          : 'bg-[#100C08] border-[#2A2016] text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <span className="text-xs">{v.name}</span>
                      <span className="font-mono text-xs font-bold">
                        ${(v.priceCents / 100).toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Modifier Groups */}
            {modalProduct.modifierGroupLinks?.map(({ modifierGroup: group }) => (
              <div key={group.id}>
                <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider block mb-2">
                  {group.name} {group.maxSelect === 1 ? '(Elige 1)' : '(Opcional)'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {group.modifiers.map((mod) => {
                    const isSelected = selectedModifiers.some((m) => m.id === mod.id);
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => toggleModifier(mod, group)}
                        className={`p-2.5 rounded-xl border text-left flex justify-between items-center transition-all ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-semibold'
                            : 'bg-[#100C08] border-[#2A2016] text-stone-300 hover:border-stone-700'
                        }`}
                      >
                        <span className="text-xs">{mod.name}</span>
                        {mod.extraPriceCents > 0 && (
                          <span className="font-mono text-[11px] text-amber-400/90">
                            +${(mod.extraPriceCents / 100).toFixed(2)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Notes / Special Instructions */}
            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">
                Instrucciones especiales para el barista:
              </label>
              <input
                type="text"
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="Ej. En taza de cerámica, tibio, sin azúcar..."
                className="w-full bg-[#100C08] border border-[#2E2419] rounded-xl px-3.5 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-3 border-t border-[#2A2016] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-stone-400 block">Total con extras:</span>
                <span className="font-mono text-lg font-bold text-amber-400">
                  $
                  {(
                    ((selectedVariant ? selectedVariant.priceCents : modalProduct.basePriceCents) +
                      selectedModifiers.reduce((acc, m) => acc + m.extraPriceCents, 0)) /
                    100
                  ).toFixed(2)}{' '}
                  MXN
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddCustomizedItem}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-950/50 transition-all"
              >
                Agregar a la Orden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT & CHECKOUT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18130C] border border-[#2E2419] rounded-3xl p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#FDF8F0]">Cobro de la Orden</h2>
                <p className="text-xs text-amber-400 font-mono">
                  {cart.orderType === 'dine_in' ? 'Consumo en Sala' : 'Para Llevar'}
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-stone-400 hover:text-stone-100 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Total Display */}
            <div className="p-4 rounded-2xl bg-[#100C08] border border-[#2A2016] text-center">
              <span className="text-xs text-stone-400 block uppercase font-mono tracking-wider">
                Total a Cobrar
              </span>
              <span className="font-serif text-3xl font-bold text-amber-400">
                ${(totalCents / 100).toFixed(2)} MXN
              </span>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-2">
                Método de Pago
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-[#100C08] border-[#2A2016] text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <Banknote size={20} />
                  <span className="text-xs">Efectivo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card_debit')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === 'card_debit'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-[#100C08] border-[#2A2016] text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <CreditCard size={20} />
                  <span className="text-xs">Tarjeta</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === 'transfer'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-[#100C08] border-[#2A2016] text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <Smartphone size={20} />
                  <span className="text-xs">SPEI / QR</span>
                </button>
              </div>
            </div>

            {/* Cash Input & Change Calculation */}
            {paymentMethod === 'cash' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-stone-400 block mb-1">
                    Efectivo Recibido ($ MXN)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(Number(e.target.value))}
                    className="w-full bg-[#100C08] border border-[#2E2419] rounded-xl px-4 py-2.5 text-lg font-mono font-bold text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Quick denomination pills */}
                <div className="flex gap-2">
                  {[50, 100, 200, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashTendered(amt)}
                      className="flex-1 py-1.5 bg-[#20180F] hover:bg-amber-500/20 border border-[#34271A] rounded-lg text-xs font-mono font-semibold text-stone-200"
                    >
                      ${amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCashTendered(Math.ceil(totalCents / 100))}
                    className="flex-1 py-1.5 bg-amber-500/15 border border-amber-500/40 rounded-lg text-xs font-mono font-semibold text-amber-300"
                  >
                    Exacto
                  </button>
                </div>

                {/* Change Due Box */}
                <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-emerald-300 font-medium">Cambio a Devolver:</span>
                  <span className="font-mono text-base font-bold text-emerald-400">
                    ${(changeCents / 100).toFixed(2)} MXN
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={isProcessingPayment || (paymentMethod === 'cash' && cashTendered * 100 < totalCents)}
              onClick={handleConfirmPayment}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-stone-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-950/50 disabled:opacity-40"
            >
              {isProcessingPayment ? 'Registrando Venta...' : 'Completar Venta y Emitir Ticket'}
            </button>
          </div>
        </div>
      )}

      {/* COMPLETED SALE RECEIPT MODAL */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#18130C] border border-[#2E2419] rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto mb-2">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-100">¡Venta Exitosa!</h3>
              <p className="font-mono text-xs text-amber-400 font-bold tracking-wider">
                Folio: {completedSale.folio}
              </p>
            </div>

            {/* Printable Ticket Receipt Preview */}
            <div className="bg-[#100C08] border border-[#2A2016] rounded-2xl p-4 font-mono text-[11px] text-stone-300 space-y-2">
              <div className="text-center border-b border-dashed border-[#2A2016] pb-2">
                <p className="font-bold text-xs text-amber-300">BREWDESK CAFETERÍA</p>
                <p className="text-[10px] text-stone-500">Av. Central Poniente 1042</p>
                <p className="text-[10px] text-stone-500">Tuxtla Gutiérrez, Chiapas</p>
              </div>

              <div className="space-y-1 py-1 border-b border-dashed border-[#2A2016]">
                <div className="flex justify-between">
                  <span>Cajero:</span>
                  <span>{completedSale.cashier?.name || 'Cajero 1'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fecha:</span>
                  <span>{new Date(completedSale.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="space-y-1 py-1 border-b border-dashed border-[#2A2016]">
                <div className="flex justify-between font-bold text-stone-100">
                  <span>Total Cobrado:</span>
                  <span className="text-amber-400">
                    ${(completedSale.totalCents / 100).toFixed(2)}
                  </span>
                </div>
                {completedSale.changeReturnedCents > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Cambio Devuelto:</span>
                    <span>${(completedSale.changeReturnedCents / 100).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <p className="text-center text-[10px] text-stone-500 pt-1">
                ¡Gracias por tu visita! ☕
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-[#20180F] hover:bg-[#2A2016] border border-[#34271A] rounded-xl text-xs font-semibold text-stone-200 flex items-center justify-center gap-1.5"
              >
                <Printer size={14} />
                <span>Imprimir</span>
              </button>
              <button
                type="button"
                onClick={() => setCompletedSale(null)}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs"
              >
                Nueva Orden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

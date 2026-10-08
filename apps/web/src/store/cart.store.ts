import { create } from 'zustand';

export interface CartModifier {
  id: number;
  name: string;
  extraPriceCents: number;
}

export interface CartItem {
  id: string;
  productId: number;
  productName: string;
  variantId?: number | null;
  variantName?: string | null;
  quantity: number;
  unitPriceCents: number;
  modifiers: CartModifier[];
  notes?: string;
  subtotalCents: number;
}

export interface CartCustomer {
  id: number;
  name: string;
  phone: string;
  loyaltyPoints: number;
}

interface CartState {
  items: CartItem[];
  orderType: 'dine_in' | 'takeaway';
  tableId: number | null;
  tableNumber: string | null;
  customerName: string;
  customer: CartCustomer | null;
  discountCents: number;
  tipCents: number;

  setOrderType: (type: 'dine_in' | 'takeaway') => void;
  setTable: (tableId: number | null, tableNumber: string | null) => void;
  setCustomerName: (name: string) => void;
  setCustomer: (customer: CartCustomer | null) => void;
  setDiscount: (cents: number) => void;
  setTip: (cents: number) => void;

  addItem: (params: {
    productId: number;
    productName: string;
    variantId?: number | null;
    variantName?: string | null;
    unitPriceCents: number;
    modifiers?: CartModifier[];
    notes?: string;
    quantity?: number;
  }) => void;

  updateQuantity: (itemId: string, delta: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;

  getSubtotalCents: () => number;
  getTotalCents: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  orderType: 'takeaway',
  tableId: null,
  tableNumber: null,
  customerName: '',
  customer: null,
  discountCents: 0,
  tipCents: 0,

  setOrderType: (type) => set({ orderType: type }),
  setTable: (tableId, tableNumber) => set({ tableId, tableNumber }),
  setCustomerName: (customerName) => set({ customerName }),
  setCustomer: (customer) => set({ customer }),
  setDiscount: (discountCents) => set({ discountCents }),
  setTip: (tipCents) => set({ tipCents }),

  addItem: (params) => {
    const qty = params.quantity || 1;
    const modifiers = params.modifiers || [];
    const modTotal = modifiers.reduce((acc, m) => acc + m.extraPriceCents, 0);
    const modKey = modifiers
      .map((m) => m.id)
      .sort((a, b) => a - b)
      .join('-');
    const cartItemId = `${params.productId}_${params.variantId || 'base'}_${modKey}_${params.notes || ''}`;

    set((state) => {
      const existingIndex = state.items.findIndex((i) => i.id === cartItemId);
      if (existingIndex > -1) {
        const nextItems = [...state.items];
        const existing = nextItems[existingIndex];
        const newQty = existing.quantity + qty;
        nextItems[existingIndex] = {
          ...existing,
          quantity: newQty,
          subtotalCents: (existing.unitPriceCents + modTotal) * newQty,
        };
        return { items: nextItems };
      }

      const newItem: CartItem = {
        id: cartItemId,
        productId: params.productId,
        productName: params.productName,
        variantId: params.variantId || null,
        variantName: params.variantName || null,
        quantity: qty,
        unitPriceCents: params.unitPriceCents,
        modifiers,
        notes: params.notes,
        subtotalCents: (params.unitPriceCents + modTotal) * qty,
      };

      return { items: [...state.items, newItem] };
    });
  },

  updateQuantity: (itemId, delta) => {
    set((state) => {
      const nextItems = state.items
        .map((item) => {
          if (item.id === itemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const modTotal = item.modifiers.reduce((acc, m) => acc + m.extraPriceCents, 0);
            return {
              ...item,
              quantity: newQty,
              subtotalCents: (item.unitPriceCents + modTotal) * newQty,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];

      return { items: nextItems };
    });
  },

  removeItem: (itemId) => {
    set((state) => ({ items: state.items.filter((i) => i.id !== itemId) }));
  },

  clearCart: () => {
    set({
      items: [],
      orderType: 'takeaway',
      tableId: null,
      tableNumber: null,
      customerName: '',
      customer: null,
      discountCents: 0,
      tipCents: 0,
    });
  },

  getSubtotalCents: () => {
    return get().items.reduce((sum, item) => sum + item.subtotalCents, 0);
  },

  getTotalCents: () => {
    const subtotal = get().getSubtotalCents();
    const discount = Math.min(get().discountCents, subtotal);
    const tip = get().tipCents;
    return subtotal - discount + tip;
  },
}));

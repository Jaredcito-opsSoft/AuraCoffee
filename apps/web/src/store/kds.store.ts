import { create } from 'zustand';
import { api } from '../lib/api';

export interface KdsItem {
  id: number;
  orderId: number;
  quantity: number;
  notes?: string | null;
  kdsStation: string;
  kdsStatus: 'pending' | 'preparing' | 'ready' | 'delivered';
  product: {
    name: string;
  };
  variant?: {
    name: string;
  } | null;
  modifiers: Array<{
    nameSnapshot: string;
  }>;
}

export interface KdsOrder {
  id: number;
  folio: string;
  orderType: 'dine_in' | 'takeaway';
  customerName?: string | null;
  openedAt: string;
  notes?: string | null;
  table?: {
    tableNumber: string;
  } | null;
  waiter?: {
    name: string;
  } | null;
  items: KdsItem[];
}

interface KdsState {
  orders: KdsOrder[];
  stationFilter: string;
  isLoading: boolean;
  setStationFilter: (station: string) => void;
  fetchOrders: () => Promise<void>;
  updateItemStatus: (itemId: number, status: 'pending' | 'preparing' | 'ready' | 'delivered') => Promise<void>;
}

export const useKdsStore = create<KdsState>((set, get) => ({
  orders: [],
  stationFilter: 'all',
  isLoading: false,

  setStationFilter: (station) => {
    set({ stationFilter: station });
    get().fetchOrders();
  },

  fetchOrders: async () => {
    try {
      const station = get().stationFilter;
      const data = await api.get<KdsOrder[]>(`/orders/kds${station !== 'all' ? `?station=${station}` : ''}`);
      set({ orders: data, isLoading: false });
    } catch (err) {
      console.error('Error fetching KDS orders:', err);
    }
  },

  updateItemStatus: async (itemId, status) => {
    try {
      await api.patch(`/orders/items/${itemId}/kds-status`, { status });
      // Optimistically update or refetch
      await get().fetchOrders();
    } catch (err) {
      console.error('Error updating KDS item status:', err);
    }
  },
}));

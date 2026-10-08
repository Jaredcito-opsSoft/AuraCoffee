import { create } from 'zustand';
import { api } from '../lib/api';

export type UserRole = 'admin' | 'manager' | 'cashier' | 'barista' | 'waiter';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  pinCode?: string | null;
}

export interface CashSession {
  id: number;
  cashRegisterId: number;
  status: 'open' | 'closed';
  openingBalanceCents: number;
  expectedCashCents: number;
  openedAt: string;
  cashRegister: {
    id: number;
    code: string;
    name: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  activeCashSession: CashSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setActiveCashSession: (session: CashSession | null) => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('brewdesk_token'),
  activeCashSession: null,
  isAuthenticated: !!localStorage.getItem('brewdesk_token'),
  isLoading: true,

  login: (token: string, user: User) => {
    localStorage.setItem('brewdesk_token', token);
    set({ token, user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('brewdesk_token');
    set({ token: null, user: null, activeCashSession: null, isAuthenticated: false, isLoading: false });
  },

  setActiveCashSession: (session) => {
    set({ activeCashSession: session });
  },

  fetchMe: async () => {
    const token = localStorage.getItem('brewdesk_token');
    if (!token) {
      set({ user: null, activeCashSession: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const data = await api.get<{ user: User; activeCashSession: CashSession | null }>('/auth/me');
      set({
        user: data.user,
        activeCashSession: data.activeCashSession,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem('brewdesk_token');
      set({ user: null, activeCashSession: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

/**
 * BrewDesk API Client wrapper with Intelligent Mock Fallback
 * Works both with real Express backend AND in standalone demo mode!
 */

import {
  mockCategories,
  mockProducts,
  mockCustomers,
  mockInventoryItems,
  mockInitialKdsOrders,
} from './mockData';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// In-memory persistent state for demo mode
let liveKdsOrders = [...mockInitialKdsOrders];
let liveInventory = [...mockInventoryItems];
let liveCustomers = [...mockCustomers];
let liveCashSession: any = {
  id: 1,
  cashRegisterId: 1,
  status: 'open',
  openingBalanceCents: 50000,
  expectedCashCents: 86400,
  totalCardCents: 142000,
  totalTransferCents: 0,
  totalTipsCents: 18000,
  openedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
  cashRegister: { id: 1, code: 'CAJA-01', name: 'Caja Mostrador Principal' },
};
let folioOrderCount = 4;
let folioTicketCount = 1;

export class ApiError extends Error {
  public code?: string;
  public details?: any;
  public status: number;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Mock route handler
function handleMockRequest<T>(endpoint: string, method = 'GET', body?: any): T {
  const cleanEndpoint = endpoint.split('?')[0];

  // Auth
  if (cleanEndpoint === '/auth/pin-login') {
    const pin = body?.pin;
    let user = { id: 1, name: 'Ana Morales (Cajera)', email: 'cajero1@brewdesk.local', role: 'cashier' };
    if (pin === '3333') user = { id: 2, name: 'Mateo Rivas (Head Barista)', email: 'barista@brewdesk.local', role: 'barista' };
    if (pin === '2222') user = { id: 3, name: 'Carlos Mendoza (Gerente)', email: 'gerente@brewdesk.local', role: 'manager' };
    if (pin === '1234') user = { id: 4, name: 'Sofía Valenzuela (Admin)', email: 'admin@brewdesk.local', role: 'admin' };
    return { token: 'mock-jwt-token', user } as T;
  }

  if (cleanEndpoint === '/auth/login') {
    const email = body?.email || 'cajero1@brewdesk.local';
    const user = { id: 1, name: 'Ana Morales (Cajera)', email, role: 'cashier' };
    return { token: 'mock-jwt-token', user } as T;
  }

  if (cleanEndpoint === '/auth/me') {
    const user = JSON.parse(localStorage.getItem('brewdesk_demo_user') || 'null') || {
      id: 1,
      name: 'Ana Morales (Cajera)',
      email: 'cajero1@brewdesk.local',
      role: 'cashier',
    };
    return { user, activeCashSession: liveCashSession } as T;
  }

  // Products & Categories
  if (cleanEndpoint === '/products/categories') {
    return mockCategories as T;
  }

  if (cleanEndpoint === '/products') {
    return mockProducts as T;
  }

  if (cleanEndpoint.startsWith('/products/') && cleanEndpoint.endsWith('/toggle-availability')) {
    const id = Number(cleanEndpoint.split('/')[2]);
    const prod = mockProducts.find((p) => p.id === id);
    if (prod) prod.isAvailable = !prod.isAvailable;
    return { isAvailable: prod?.isAvailable } as T;
  }

  // KDS & Orders
  if (cleanEndpoint === '/orders/kds') {
    return liveKdsOrders as T;
  }

  if (cleanEndpoint.startsWith('/orders/items/') && cleanEndpoint.endsWith('/kds-status')) {
    const itemId = Number(cleanEndpoint.split('/')[3]);
    const newStatus = body?.status;
    liveKdsOrders.forEach((o) => {
      o.items.forEach((item) => {
        if (item.id === itemId) item.kdsStatus = newStatus;
      });
    });
    return { success: true } as T;
  }

  if (cleanEndpoint === '/orders' && method === 'POST') {
    const folio = `CMD-${String(folioOrderCount++).padStart(4, '0')}`;
    const newOrder: any = {
      id: Date.now(),
      folio,
      orderType: body.orderType,
      customerName: body.customerName,
      openedAt: new Date().toISOString(),
      table: body.tableId ? { tableNumber: `M-${body.tableId.toString().padStart(2, '0')}` } : null,
      items: body.items.map((i: any, idx: number) => {
        const prod = mockProducts.find((p) => p.id === i.productId);
        const variant = prod?.variants.find((v) => v.id === i.variantId);
        return {
          id: Date.now() + idx,
          quantity: i.quantity,
          kdsStation: prod?.preparationStation || 'barista_hot',
          kdsStatus: 'pending',
          product: { name: prod?.name || 'Café' },
          variant: variant ? { name: variant.name } : null,
          modifiers: (i.modifierIds || []).map((mid: number) => ({ nameSnapshot: `Extra #${mid}` })),
          notes: i.notes,
        };
      }),
    };
    liveKdsOrders = [newOrder, ...liveKdsOrders];
    return newOrder as T;
  }

  // Sales
  if (cleanEndpoint === '/sales' && method === 'POST') {
    const folio = `TKT-${String(folioTicketCount++).padStart(4, '0')}`;
    const totalCents = body.subtotalCents - (body.discountCents || 0) + (body.tipCents || 0);
    const sale = {
      id: Date.now(),
      folio,
      totalCents,
      changeReturnedCents: Math.max(0, (body.payments?.[0]?.amountCents || totalCents) - totalCents),
      createdAt: new Date().toISOString(),
      cashier: { name: 'Ana Morales' },
    };
    // Update live cash session
    if (liveCashSession && body.payments?.[0]?.paymentMethod === 'cash') {
      liveCashSession.expectedCashCents += totalCents;
    }
    return sale as T;
  }

  // Inventory
  if (cleanEndpoint === '/inventory/items') {
    return liveInventory as T;
  }

  if (cleanEndpoint === '/inventory/alerts') {
    return liveInventory.filter((i) => i.status !== 'optimal') as T;
  }

  if (cleanEndpoint.startsWith('/inventory/items/') && cleanEndpoint.endsWith('/entry')) {
    const id = Number(cleanEndpoint.split('/')[3]);
    const item = liveInventory.find((i) => i.id === id);
    if (item) {
      item.currentStock += Number(body.quantity);
      if (item.currentStock > item.minimumStock * 1.5) item.status = 'optimal';
    }
    return { success: true, item } as T;
  }

  if (cleanEndpoint.startsWith('/inventory/items/') && cleanEndpoint.endsWith('/waste')) {
    const id = Number(cleanEndpoint.split('/')[3]);
    const item = liveInventory.find((i) => i.id === id);
    if (item) {
      item.currentStock = Math.max(0, item.currentStock - Number(body.quantity));
      if (item.currentStock <= item.minimumStock) item.status = 'critical';
    }
    return { success: true, item } as T;
  }

  if (cleanEndpoint === '/inventory/movements') {
    return [
      {
        id: 1,
        movementType: 'sale_consumption',
        quantity: -18,
        stockBefore: 18018,
        stockAfter: 18000,
        reason: 'Consumo comanda CMD-0001',
        createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
        inventoryItem: { name: 'Café Grano Chiapas Tostado Medio', unit: 'g' },
      },
      {
        id: 2,
        movementType: 'stock_entry',
        quantity: 5000,
        stockBefore: 13000,
        stockAfter: 18000,
        reason: 'Compra semanal proveedor Chiapas',
        createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
        inventoryItem: { name: 'Café Grano Chiapas Tostado Medio', unit: 'g' },
      },
    ] as T;
  }

  // Customers
  if (cleanEndpoint === '/customers/search') {
    return liveCustomers as T;
  }

  // Cash Sessions
  if (cleanEndpoint === '/cash/registers') {
    return [
      { id: 1, code: 'CAJA-01', name: 'Caja Mostrador Principal' },
      { id: 2, code: 'BARRA-01', name: 'Terminal Barra Rápida' },
    ] as T;
  }

  if (cleanEndpoint === '/cash/current-session') {
    return liveCashSession as T;
  }

  if (cleanEndpoint === '/cash/open-session') {
    liveCashSession = {
      id: Date.now(),
      cashRegisterId: body.cashRegisterId,
      status: 'open',
      openingBalanceCents: body.openingBalanceCents,
      expectedCashCents: body.openingBalanceCents,
      totalCardCents: 0,
      totalTransferCents: 0,
      totalTipsCents: 0,
      openedAt: new Date().toISOString(),
      cashRegister: { id: body.cashRegisterId, code: 'CAJA-01', name: 'Caja Mostrador Principal' },
    };
    return liveCashSession as T;
  }

  if (cleanEndpoint.includes('/movements')) {
    const isDeposit = body.type === 'in_deposit';
    if (liveCashSession) {
      liveCashSession.expectedCashCents += isDeposit ? body.amountCents : -body.amountCents;
    }
    return { success: true } as T;
  }

  if (cleanEndpoint.endsWith('/corte-x')) {
    return {
      cashier: 'Ana Morales',
      openingBalanceCents: liveCashSession?.openingBalanceCents || 50000,
      expectedCashCents: liveCashSession?.expectedCashCents || 86400,
      totalCardCents: liveCashSession?.totalCardCents || 142000,
      totalSalesCount: 18,
      totalSalesCents: 228400,
    } as T;
  }

  if (cleanEndpoint.endsWith('/close')) {
    liveCashSession = null;
    return { success: true } as T;
  }

  // Dashboard KPIs
  if (cleanEndpoint === '/dashboard/kpis') {
    return {
      kpis: {
        totalSalesMxn: 3450.0,
        totalTicketsCount: 32,
        averageTicketMxn: 107.8,
        totalTipsMxn: 380.0,
        occupancyRate: 62,
        totalTables: 8,
        busyTables: 5,
        lowStockCount: 2,
      },
      hourlyChartData: [
        { hour: '07:00', tickets: 2, sales: 180 },
        { hour: '08:00', tickets: 8, sales: 740 },
        { hour: '09:00', tickets: 12, sales: 1150 },
        { hour: '10:00', tickets: 6, sales: 580 },
        { hour: '11:00', tickets: 4, sales: 380 },
        { hour: '12:00', tickets: 5, sales: 420 },
      ],
      topProducts: [
        { name: 'Flat White Australiano (8oz)', category: 'Café Caliente', quantitySold: 16, revenueCents: 99200 },
        { name: 'Cold Brew Macerado 18h', category: 'Café Frío', quantitySold: 12, revenueCents: 84000 },
        { name: 'Panini Serrano, Gouda y Pesto', category: 'Alimentos', quantitySold: 8, revenueCents: 100000 },
        { name: 'Café Latte de la Casa', category: 'Café Caliente', quantitySold: 7, revenueCents: 45500 },
        { name: 'Croissant Francés de Mantequilla', category: 'Repostería', quantitySold: 7, revenueCents: 33600 },
      ],
    } as T;
  }

  return {} as T;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('brewdesk_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // If 404 or backend unavailable, use mock fallback
      if (response.status === 404 || response.status === 502 || response.status === 503) {
        return handleMockRequest<T>(
          endpoint,
          options.method || 'GET',
          options.body ? JSON.parse(options.body as string) : undefined
        );
      }
      const json = await response.json().catch(() => ({}));
      const errorMsg = json.error?.message || response.statusText || 'Error en la petición';
      throw new ApiError(errorMsg, response.status, json.error?.code, json.error?.details);
    }

    const json = await response.json().catch(() => ({}));
    return json.data !== undefined ? json.data : (json as T);
  } catch (err: any) {
    // Network error or backend offline -> automatically fallback to mock demo mode
    if (err.name === 'TypeError' || err.message?.includes('fetch')) {
      return handleMockRequest<T>(
        endpoint,
        options.method || 'GET',
        options.body ? JSON.parse(options.body as string) : undefined
      );
    }
    throw err;
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

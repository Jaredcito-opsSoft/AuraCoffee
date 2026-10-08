import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/login/LoginPage';
import { PosPage } from './pages/pos/PosPage';
import { KdsPage } from './pages/kds/KdsPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { CashPage } from './pages/cash/CashPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProductsPage } from './pages/products/ProductsPage';
import { useAuthStore } from './store/auth.store';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#0F0C08] flex items-center justify-center text-amber-400 font-mono text-xs">
        Cargando BrewDesk...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Default Landing Redirection based on role
const RoleBasedRedirect: React.FC = () => {
  const { user } = useAuthStore();
  if (user?.role === 'barista') {
    return <Navigate to="/kds" replace />;
  }
  return <Navigate to="/pos" replace />;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <RoleBasedRedirect />,
      },
      {
        path: 'pos',
        element: <PosPage />,
      },
      {
        path: 'kds',
        element: <KdsPage />,
      },
      {
        path: 'inventory',
        element: <InventoryPage />,
      },
      {
        path: 'cash',
        element: <CashPage />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'products',
        element: <ProductsPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/pos" replace />,
  },
]);

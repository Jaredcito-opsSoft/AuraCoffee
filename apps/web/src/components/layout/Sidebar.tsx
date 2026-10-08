import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShoppingBag,
  ChefHat,
  Coffee,
  Boxes,
  Receipt,
  LayoutDashboard,
  LogOut,
  CircleDot,
  User as UserIcon,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

export const Sidebar: React.FC = () => {
  const { user, activeCashSession, logout } = useAuthStore();

  const navItems = [
    { to: '/pos', label: 'Terminal POS', icon: ShoppingBag, roles: ['admin', 'manager', 'cashier', 'waiter'] },
    { to: '/kds', label: 'Pantalla KDS', icon: ChefHat, roles: ['admin', 'manager', 'barista', 'cashier'] },
    { to: '/products', label: 'Catálogo', icon: Coffee, roles: ['admin', 'manager'] },
    { to: '/inventory', label: 'Inventario', icon: Boxes, roles: ['admin', 'manager', 'barista'] },
    { to: '/cash', label: 'Caja & Turnos', icon: Receipt, roles: ['admin', 'manager', 'cashier'] },
    { to: '/dashboard', label: 'Métricas', icon: LayoutDashboard, roles: ['admin', 'manager'] },
  ];

  const allowedItems = navItems.filter(
    (item) => !user || item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 bg-[#14100B] border-r border-[#2A2016] flex flex-col justify-between shrink-0 h-full select-none">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-[#2A2016] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-950/40">
              <span className="text-xl">☕</span>
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold tracking-wide text-amber-50">
                BrewDesk
              </h1>
              <p className="text-[10px] tracking-widest text-amber-400 uppercase font-semibold">
                Café de Especialidad
              </p>
            </div>
          </div>
        </div>

        {/* Cash Session Status Pill */}
        <div className="px-4 py-3">
          <NavLink
            to="/cash"
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border transition-all ${
              activeCashSession
                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                : 'bg-amber-950/20 border-amber-800/40 text-amber-300/80 hover:bg-amber-950/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <CircleDot
                size={14}
                className={activeCashSession ? 'text-emerald-400 animate-pulse' : 'text-amber-500'}
              />
              <span className="font-medium">
                {activeCashSession ? activeCashSession.cashRegister.name : 'Caja Cerrada'}
              </span>
            </div>
            <span className="text-[10px] opacity-75">
              {activeCashSession ? 'Turno Activo' : 'Abrir'}
            </span>
          </NavLink>
        </div>

        {/* Navigation Menu */}
        <nav className="px-3 space-y-1">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-inner'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60'
                  }`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Card & Logout Footer */}
      <div className="p-4 border-t border-[#2A2016] bg-[#0F0C08]/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400">
              <UserIcon size={16} />
            </div>
            <div className="leading-tight">
              <p className="text-xs font-semibold text-stone-200 truncate max-w-[110px]">
                {user?.name || 'Usuario'}
              </p>
              <span className="text-[10px] font-mono text-amber-500 capitalize">
                {user?.role || 'Invitado'}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Cerrar sesión"
            className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

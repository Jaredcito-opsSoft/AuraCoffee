import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  ShoppingBag,
  Users,
  Award,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { api } from '../../lib/api';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/dashboard/kpis');
      setData(res);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const kpis = data?.kpis || {
    totalSalesMxn: 0,
    totalTicketsCount: 0,
    averageTicketMxn: 0,
    totalTipsMxn: 0,
    occupancyRate: 0,
    lowStockCount: 0,
  };

  const hourlyChart = data?.hourlyChartData || [];
  const topProducts = data?.topProducts || [];

  return (
    <div className="space-y-6 select-none max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#FDF8F0]">
            Panel de Métricas & Rendimiento
          </h1>
          <p className="text-xs text-stone-400">
            Resumen en tiempo real de ventas, ticket promedio, horas pico y rotación de productos
          </p>
        </div>

        <button
          onClick={loadStats}
          className="px-3.5 py-2 bg-[#14100B] hover:bg-[#20180F] border border-[#2A2016] rounded-xl text-xs font-semibold text-stone-300 flex items-center gap-1.5 self-start transition-colors"
        >
          <RotateCcw size={14} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales */}
        <div className="p-4 rounded-2xl bg-[#14100B] border border-[#2A2016] shadow-lg flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-[11px] text-stone-400 uppercase font-mono block">
              Ventas de Hoy
            </span>
            <span className="font-mono text-xl font-bold text-amber-400">
              ${kpis.totalSalesMxn.toFixed(2)} MXN
            </span>
          </div>
        </div>

        {/* Average Ticket */}
        <div className="p-4 rounded-2xl bg-[#14100B] border border-[#2A2016] shadow-lg flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <ShoppingBag size={24} />
          </div>
          <div>
            <span className="text-[11px] text-stone-400 uppercase font-mono block">
              Ticket Promedio
            </span>
            <span className="font-mono text-xl font-bold text-stone-100">
              ${kpis.averageTicketMxn.toFixed(2)} MXN
            </span>
            <span className="text-[10px] text-stone-500 font-mono block">
              {kpis.totalTicketsCount} tickets emitidos
            </span>
          </div>
        </div>

        {/* Occupancy */}
        <div className="p-4 rounded-2xl bg-[#14100B] border border-[#2A2016] shadow-lg flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Users size={24} />
          </div>
          <div>
            <span className="text-[11px] text-stone-400 uppercase font-mono block">
              Ocupación Mesas
            </span>
            <span className="font-mono text-xl font-bold text-emerald-400">
              {kpis.occupancyRate}%
            </span>
            <span className="text-[10px] text-stone-500 font-mono block">
              {kpis.busyTables || 0} de {kpis.totalTables || 8} ocupadas
            </span>
          </div>
        </div>

        {/* Tips */}
        <div className="p-4 rounded-2xl bg-[#14100B] border border-[#2A2016] shadow-lg flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Award size={24} />
          </div>
          <div>
            <span className="text-[11px] text-stone-400 uppercase font-mono block">
              Propinas del Día
            </span>
            <span className="font-mono text-xl font-bold text-purple-300">
              ${kpis.totalTipsMxn.toFixed(2)} MXN
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Hourly Sales Curve */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-[#14100B] border border-[#2A2016] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-amber-400" />
              <h3 className="font-serif font-bold text-base text-stone-100">
                Curva de Ventas por Hora (Horas Pico)
              </h3>
            </div>
            <span className="text-[11px] text-stone-400 font-mono">Hoy</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D97706" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#221A12" />
                <XAxis dataKey="hour" stroke="#78716C" fontSize={11} />
                <YAxis stroke="#78716C" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18130C',
                    borderColor: '#34271A',
                    borderRadius: '12px',
                    color: '#FDF8F0',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`$${val} MXN`, 'Ventas']}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#D97706"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Products Bar Chart */}
        <div className="p-5 rounded-3xl bg-[#14100B] border border-[#2A2016] shadow-xl space-y-4">
          <h3 className="font-serif font-bold text-base text-stone-100">
            Top 5 Productos Más Vendidos
          </h3>

          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-xs text-stone-500 py-8 text-center">
                Aún no hay ventas registradas el día de hoy.
              </p>
            ) : (
              topProducts.map((p: any, idx: number) => (
                <div key={idx} className="p-2.5 rounded-xl bg-[#18130C] border border-[#2A2016] flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold text-stone-200 block">{p.name}</span>
                    <span className="text-[10px] text-stone-500">{p.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-amber-400 block">
                      {p.quantitySold} vendidos
                    </span>
                    <span className="font-mono text-[10px] text-stone-400">
                      ${(p.revenueCents / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

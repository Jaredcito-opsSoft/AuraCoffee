import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  ChefHat,
  Coffee,
  Snowflake,
  Utensils,
  Flame,
} from 'lucide-react';
import { useKdsStore, KdsOrder } from '../../store/kds.store';
import { supabase } from '../../lib/supabase';

export const KdsPage: React.FC = () => {
  const { orders, stationFilter, setStationFilter, fetchOrders, updateItemStatus } = useKdsStore();
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000); // Polling fallback

    // Supabase Realtime channel subscription if available
    let channel: any = null;
    if (supabase) {
      channel = supabase
        .channel('kds-orders-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            fetchOrders();
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (channel) {
        supabase?.removeChannel(channel);
      }
    };
  }, [stationFilter]);

  const stations = [
    { id: 'all', label: 'Todas las Estaciones', icon: ChefHat },
    { id: 'barista_hot', label: 'Barra Caliente', icon: Coffee },
    { id: 'barista_cold', label: 'Barra Fría / Cold Brew', icon: Snowflake },
    { id: 'kitchen', label: 'Cocina & Paninis', icon: Utensils },
  ];

  // Helper for elapsed minutes and color status
  const getElapsedInfo = (openedAt: string) => {
    const elapsedMinutes = Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000);
    if (elapsedMinutes >= 10) {
      return { minutes: elapsedMinutes, color: 'text-red-400 border-red-500/50 bg-red-950/20 animate-pulse', label: 'Retrasado' };
    }
    if (elapsedMinutes >= 5) {
      return { minutes: elapsedMinutes, color: 'text-amber-400 border-amber-500/50 bg-amber-950/20', label: 'Atención' };
    }
    return { minutes: elapsedMinutes, color: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/20', label: 'A tiempo' };
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] space-y-4 select-none">
      {/* Top Station Bar & Controls */}
      <div className="flex items-center justify-between p-3 bg-[#14100B] border border-[#2A2016] rounded-2xl shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {stations.map((st) => {
            const Icon = st.icon;
            const isActive = stationFilter === st.id;
            return (
              <button
                key={st.id}
                onClick={() => setStationFilter(st.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-950/40'
                    : 'bg-[#20180F] text-stone-300 hover:bg-[#2A2016] border border-[#34271A]'
                }`}
              >
                <Icon size={14} />
                <span>{st.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400 font-mono hidden md:inline">
            {orders.length} órdenes en preparación
          </span>
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="p-2 bg-[#20180F] hover:bg-[#2A2016] border border-[#34271A] rounded-xl text-stone-300 transition-colors"
            title="Activar o silenciar avisos sonoros"
          >
            {audioEnabled ? <Volume2 size={16} className="text-amber-400" /> : <VolumeX size={16} />}
          </button>
          <button
            onClick={() => fetchOrders()}
            className="p-2 bg-[#20180F] hover:bg-[#2A2016] border border-[#34271A] rounded-xl text-stone-300 transition-colors"
            title="Actualizar comandes"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Active Orders Grid */}
      <div className="flex-1 overflow-y-auto">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-stone-500 text-sm">
            <ChefHat size={48} className="mb-3 opacity-30 text-amber-400" />
            <p className="font-semibold text-stone-400">Sin comandas pendientes en esta estación</p>
            <p className="text-xs text-stone-600 mt-1">Los nuevos pedidos enviados desde el POS aparecerán aquí instantáneamente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map((order) => {
              const elapsed = getElapsedInfo(order.openedAt);
              return (
                <div
                  key={order.id}
                  className={`bg-[#18130C] rounded-2xl border flex flex-col justify-between overflow-hidden shadow-xl transition-all ${elapsed.color}`}
                >
                  {/* Card Header */}
                  <div className="p-3.5 border-b border-[#2A2016] bg-[#120E0A]/90 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-amber-400">
                          {order.folio}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-800 text-stone-300">
                          {order.orderType === 'dine_in'
                            ? order.table?.tableNumber || 'Mesa'
                            : 'Para Llevar'}
                        </span>
                      </div>
                      {order.customerName && (
                        <p className="text-xs font-semibold text-stone-200 mt-0.5">
                          {order.customerName}
                        </p>
                      )}
                    </div>

                    {/* Timer Badge */}
                    <div className="flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-black/40 border border-[#2A2016]">
                      <Clock size={12} />
                      <span>{elapsed.minutes}m</span>
                    </div>
                  </div>

                  {/* Order Items Checklist */}
                  <div className="p-3.5 flex-1 space-y-2.5 overflow-y-auto max-h-72">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-[#100C08]/60 border border-[#2A2016] space-y-1.5 cursor-pointer hover:border-amber-500/40 transition-colors"
                        onClick={() => {
                          const nextStatus =
                            item.kdsStatus === 'pending'
                              ? 'preparing'
                              : item.kdsStatus === 'preparing'
                              ? 'ready'
                              : 'delivered';
                          updateItemStatus(item.id, nextStatus);
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-xs font-bold flex items-center justify-center">
                              {item.quantity}
                            </span>
                            <span className="text-xs font-bold text-stone-100">
                              {item.product.name}
                            </span>
                          </div>

                          {/* Status Pill */}
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                              item.kdsStatus === 'ready'
                                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                                : item.kdsStatus === 'preparing'
                                ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                                : 'bg-stone-900 border-stone-700 text-stone-400'
                            }`}
                          >
                            {item.kdsStatus === 'ready'
                              ? 'Listo'
                              : item.kdsStatus === 'preparing'
                              ? 'En Barra'
                              : 'Espera'}
                          </span>
                        </div>

                        {item.variant && (
                          <p className="text-[11px] text-amber-400/90 font-medium pl-7">
                            {item.variant.name}
                          </p>
                        )}

                        {item.modifiers?.length > 0 && (
                          <div className="pl-7 space-y-0.5 text-[10px] text-stone-400">
                            {item.modifiers.map((m, idx) => (
                              <p key={idx} className="text-amber-200/80">
                                • {m.nameSnapshot}
                              </p>
                            ))}
                          </div>
                        )}

                        {item.notes && (
                          <p className="pl-7 text-[10px] italic text-amber-300/80">
                            "{item.notes}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Card Bottom Quick Actions */}
                  <div className="p-3 border-t border-[#2A2016] bg-[#120E0A]/90 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        order.items.forEach((i) => updateItemStatus(i.id, 'preparing'));
                      }}
                      className="py-1.5 rounded-lg bg-[#20180F] hover:bg-amber-500/20 border border-[#34271A] text-xs font-semibold text-amber-300 flex items-center justify-center gap-1 transition-colors"
                    >
                      <Play size={12} />
                      <span>Preparar</span>
                    </button>
                    <button
                      onClick={() => {
                        order.items.forEach((i) => updateItemStatus(i.id, 'ready'));
                      }}
                      className="py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800 text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1 transition-colors"
                    >
                      <CheckCircle size={12} />
                      <span>¡Listo!</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

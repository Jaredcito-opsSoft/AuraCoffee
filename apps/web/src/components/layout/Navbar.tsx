import React, { useState, useEffect } from 'react';
import { Wifi, Bell } from 'lucide-react';
import { api } from '../../lib/api';

export const Navbar: React.FC = () => {
  const [time, setTime] = useState<string>('');
  const [alertCount, setAlertCount] = useState<number>(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Fetch low stock alerts count periodically
    const checkAlerts = async () => {
      try {
        const alerts = await api.get<any[]>('/inventory/alerts');
        if (Array.isArray(alerts)) {
          setAlertCount(alerts.length);
        }
      } catch {
        // quiet catch
      }
    };
    checkAlerts();
    const interval = setInterval(checkAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-[#14100B]/90 backdrop-blur-md border-b border-[#2A2016] px-6 flex items-center justify-between shrink-0 select-none">
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
        <span className="text-xs font-medium text-stone-300">Terminal Conectada</span>
        <span className="text-stone-600">|</span>
        <span className="text-xs text-amber-500/90 font-mono">Sucursal Central</span>
      </div>

      <div className="flex items-center gap-5">
        {/* Alerts Pill */}
        {alertCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-medium">
            <Bell size={13} className="animate-bounce" />
            <span>{alertCount} alertas de stock</span>
          </div>
        )}

        {/* Online Status */}
        <div className="flex items-center gap-1.5 text-stone-400 text-xs">
          <Wifi size={14} className="text-emerald-400" />
          <span>Online</span>
        </div>

        {/* Live Clock */}
        <div className="bg-[#0F0C08] border border-[#2A2016] px-3 py-1 rounded-lg">
          <span className="font-mono text-xs font-semibold text-amber-400 tracking-wider">
            {time || '--:--:--'}
          </span>
        </div>
      </div>
    </header>
  );
};

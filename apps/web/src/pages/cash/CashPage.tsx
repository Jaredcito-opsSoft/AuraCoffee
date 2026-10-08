import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  X,
  CreditCard,
  Banknote,
  Smartphone,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

export const CashPage: React.FC = () => {
  const { user, activeCashSession, setActiveCashSession } = useAuthStore();

  const [registers, setRegisters] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Open Session Form
  const [selectedRegisterId, setSelectedRegisterId] = useState<number>(1);
  const [openingBalance, setOpeningBalance] = useState<number>(500);

  // Cash Movement Modal
  const [showMovementModal, setShowMovementModal] = useState<boolean>(false);
  const [movementType, setMovementType] = useState<'in_deposit' | 'out_withdrawal' | 'petty_cash_expense'>('in_deposit');
  const [movementAmount, setMovementAmount] = useState<number>(0);
  const [movementReason, setMovementReason] = useState<string>('');

  // Corte X Modal
  const [showCorteX, setShowCorteX] = useState<boolean>(false);
  const [corteXData, setCorteXData] = useState<any | null>(null);

  // Corte Z Modal
  const [showCorteZ, setShowCorteZ] = useState<boolean>(false);
  const [blindCountCash, setBlindCountCash] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [closedSummary, setClosedSummary] = useState<any | null>(null);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      setLoading(true);
      const [regs, current] = await Promise.all([
        api.get<any[]>('/cash/registers'),
        api.get<any>('/cash/current-session'),
      ]);
      setRegisters(regs);
      setActiveCashSession(current);
      if (regs.length > 0 && !current) {
        setSelectedRegisterId(regs[0].id);
      }
    } catch (err) {
      console.error('Error loading cash session:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const session = await api.post<any>('/cash/open-session', {
        cashRegisterId: selectedRegisterId,
        openingBalanceCents: Math.round(openingBalance * 100),
      });
      setActiveCashSession(session);
      alert('✅ Turno de caja abierto correctamente.');
      loadSession();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCashSession || movementAmount <= 0) return;
    try {
      await api.post(`/cash/${activeCashSession.id}/movements`, {
        type: movementType,
        amountCents: Math.round(movementAmount * 100),
        reason: movementReason.trim() || 'Movimiento de caja',
      });
      setShowMovementModal(false);
      setMovementAmount(0);
      setMovementReason('');
      alert('✅ Movimiento registrado en caja.');
      loadSession();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleOpenCorteX = async () => {
    if (!activeCashSession) return;
    try {
      const data = await api.get<any>(`/cash/${activeCashSession.id}/corte-x`);
      setCorteXData(data);
      setShowCorteX(true);
    } catch (err: any) {
      alert(`Error al generar Corte X: ${err.message}`);
    }
  };

  const handleConfirmCorteZ = async () => {
    if (!activeCashSession) return;
    try {
      const closed = await api.post<any>(`/cash/${activeCashSession.id}/close`, {
        actualCashCents: Math.round(blindCountCash * 100),
        closingNotes: closingNotes.trim() || undefined,
      });
      setClosedSummary(closed);
      setActiveCashSession(null);
      setShowCorteZ(false);
      loadSession();
    } catch (err: any) {
      alert(`Error al cerrar caja: ${err.message}`);
    }
  };

  return (
    <div className="space-y-5 select-none max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#FDF8F0]">
          Control de Caja & Cortes de Turno
        </h1>
        <p className="text-xs text-stone-400">
          Apertura de turno, fondos de cambio, arqueo ciego y cortes X / Z
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-stone-400 text-sm">Cargando estado de caja...</div>
      ) : !activeCashSession ? (
        /* NO OPEN SESSION: OPEN SESSION FORM */
        <div className="bg-[#14100B] border border-[#2A2016] rounded-3xl p-6 sm:p-8 max-w-lg mx-auto shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-3">
              <Wallet size={28} />
            </div>
            <h2 className="font-serif text-xl font-bold text-stone-100">Apertura de Turno de Caja</h2>
            <p className="text-xs text-stone-400 mt-1">
              Ingresa el fondo de cambio inicial para comenzar a operar el punto de venta.
            </p>
          </div>

          <form onSubmit={handleOpenSession} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">
                Terminal de Caja:
              </label>
              <select
                value={selectedRegisterId}
                onChange={(e) => setSelectedRegisterId(Number(e.target.value))}
                className="w-full bg-[#100C08] border border-[#2E2419] rounded-xl px-4 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              >
                {registers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">
                Fondo Inicial en Efectivo ($ MXN):
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={openingBalance}
                onChange={(e) => setOpeningBalance(Number(e.target.value))}
                placeholder="500"
                className="w-full bg-[#100C08] border border-[#2E2419] rounded-xl px-4 py-2.5 text-lg font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Quick buttons */}
            <div className="flex gap-2">
              {[300, 500, 800, 1000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setOpeningBalance(amt)}
                  className="flex-1 py-1.5 bg-[#20180F] hover:bg-amber-500/20 border border-[#34271A] rounded-lg text-xs font-mono font-semibold text-stone-300"
                >
                  ${amt}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-stone-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-950/50 mt-2"
            >
              Iniciar Turno de Caja
            </button>
          </form>
        </div>
      ) : (
        /* ACTIVE SESSION DASHBOARD */
        <div className="space-y-5">
          {/* Main Card */}
          <div className="bg-[#14100B] border border-[#2A2016] rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2A2016]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-stone-100">
                    {activeCashSession.cashRegister.name}
                  </h2>
                  <p className="text-xs text-stone-400 flex items-center gap-2 mt-0.5">
                    <Clock size={12} className="text-amber-400" />
                    <span>Abierto desde: {new Date(activeCashSession.openedAt).toLocaleTimeString('es-MX')}</span>
                    <span>•</span>
                    <span className="text-amber-300">Cajero: {user?.name}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(true)}
                  className="px-3 py-2 bg-[#20180F] hover:bg-amber-500/20 border border-[#34271A] rounded-xl text-xs font-semibold text-amber-300 flex items-center gap-1.5 transition-colors"
                >
                  <ArrowDownCircle size={14} />
                  <span>Entrada / Salida</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenCorteX}
                  className="px-3 py-2 bg-[#20180F] hover:bg-stone-800 border border-[#34271A] rounded-xl text-xs font-semibold text-stone-200 flex items-center gap-1.5 transition-colors"
                >
                  <Receipt size={14} />
                  <span>Corte X (Parcial)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBlindCountCash(activeCashSession.expectedCashCents / 100);
                    setShowCorteZ(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-stone-100 rounded-xl text-xs font-bold shadow-lg shadow-red-950/40 transition-all"
                >
                  Corte Z (Cerrar Turno)
                </button>
              </div>
            </div>

            {/* Balances Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-[#18130C] border border-[#2E2419]">
                <span className="text-[11px] text-stone-400 font-mono block uppercase">
                  Fondo Inicial
                </span>
                <span className="font-mono text-xl font-bold text-stone-200">
                  ${(activeCashSession.openingBalanceCents / 100).toFixed(2)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#18130C] border border-[#2E2419]">
                <span className="text-[11px] text-stone-400 font-mono block uppercase flex items-center gap-1">
                  <Banknote size={12} className="text-emerald-400" />
                  Efectivo Esperado
                </span>
                <span className="font-mono text-xl font-bold text-amber-400">
                  ${(activeCashSession.expectedCashCents / 100).toFixed(2)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#18130C] border border-[#2E2419]">
                <span className="text-[11px] text-stone-400 font-mono block uppercase flex items-center gap-1">
                  <CreditCard size={12} className="text-sky-400" />
                  Ventas Tarjetas
                </span>
                <span className="font-mono text-xl font-bold text-sky-400">
                  ${(activeCashSession.totalCardCents / 100).toFixed(2)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#18130C] border border-[#2E2419]">
                <span className="text-[11px] text-stone-400 font-mono block uppercase flex items-center gap-1">
                  <Smartphone size={12} className="text-purple-400" />
                  Propinas Totales
                </span>
                <span className="font-mono text-xl font-bold text-emerald-400">
                  ${(activeCashSession.totalTipsCents / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CASH MOVEMENT MODAL */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddMovement}
            className="w-full max-w-md bg-[#18130C] border border-[#2E2419] rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-100">
                  Movimiento de Efectivo en Caja
                </h3>
                <p className="text-xs text-stone-400">Entrada adicional o retiro de caja chica</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMovementModal(false)}
                className="text-stone-400 hover:text-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">
                Tipo de Movimiento:
              </label>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as any)}
                className="w-full bg-[#100C08] border border-[#2E2419] rounded-xl px-4 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              >
                <option value="in_deposit">Ingreso / Depósito de Efectivo (+)</option>
                <option value="out_withdrawal">Retiro Parcial de Seguridad (-)</option>
                <option value="petty_cash_expense">Gasto de Caja Chica (Hielo, Insumos) (-)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">
                Monto ($ MXN):
              </label>
              <input
                type="number"
                step="1"
                required
                value={movementAmount || ''}
                onChange={(e) => setMovementAmount(Number(e.target.value))}
                placeholder="200"
                className="w-full bg-[#100C08] border border-[#2E2419] rounded-xl px-4 py-2.5 text-lg font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">
                Motivo / Justificación:
              </label>
              <input
                type="text"
                required
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
                placeholder="Ej. Compra de 2 bolsas de hielo para barra"
                className="w-full bg-[#100C08] border border-[#2E2419] rounded-xl px-4 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={movementAmount <= 0 || !movementReason}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-950/50 transition-all disabled:opacity-40"
            >
              Registrar Movimiento en Caja
            </button>
          </form>
        </div>
      )}

      {/* CORTE X MODAL */}
      {showCorteX && corteXData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#18130C] border border-[#2E2419] rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="text-center">
              <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                Corte X (Parcial)
              </span>
              <h3 className="font-serif text-lg font-bold text-stone-100 mt-2">
                Resumen Informativo
              </h3>
              <p className="text-[11px] text-stone-400">Este corte no cierra el turno de caja.</p>
            </div>

            <div className="bg-[#100C08] border border-[#2A2016] rounded-2xl p-4 font-mono text-xs space-y-2 text-stone-300">
              <div className="flex justify-between">
                <span>Cajero:</span>
                <span>{corteXData.cashier}</span>
              </div>
              <div className="flex justify-between">
                <span>Tickets Cobrados:</span>
                <span>{corteXData.totalSalesCount}</span>
              </div>
              <div className="flex justify-between border-t border-[#2A2016] pt-1">
                <span>Fondo Inicial:</span>
                <span>${(corteXData.openingBalanceCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-amber-400 font-bold">
                <span>Efectivo en Caja:</span>
                <span>${(corteXData.expectedCashCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sky-400">
                <span>Total Tarjetas:</span>
                <span>${(corteXData.totalCardCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-400 border-t border-[#2A2016] pt-1 font-bold">
                <span>Ventas Totales:</span>
                <span>${(corteXData.totalSalesCents / 100).toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCorteX(false)}
              className="w-full py-2.5 bg-[#20180F] hover:bg-[#2A2016] text-stone-200 font-semibold rounded-xl text-xs border border-[#34271A]"
            >
              Cerrar Vista
            </button>
          </div>
        </div>
      )}

      {/* CORTE Z MODAL (BLIND ARQUEO) */}
      {showCorteZ && activeCashSession && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18130C] border border-[#2E2419] rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto mb-2">
                <Receipt size={24} />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-100">
                Cierre Definitivo de Turno (Corte Z)
              </h3>
              <p className="text-xs text-stone-400">
                Realiza el conteo físico del efectivo en cajón para calcular el sobrante o faltante.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">
                Efectivo Físico Contado ($ MXN):
              </label>
              <input
                type="number"
                step="1"
                value={blindCountCash}
                onChange={(e) => setBlindCountCash(Number(e.target.value))}
                className="w-full bg-[#100C08] border border-[#2E2419] rounded-xl px-4 py-2.5 text-xl font-mono font-bold text-stone-100 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Difference Preview */}
            {(() => {
              const expectedMxn = activeCashSession.expectedCashCents / 100;
              const diff = blindCountCash - expectedMxn;
              return (
                <div
                  className={`p-3 rounded-xl border flex justify-between items-center text-xs font-mono font-bold ${
                    diff === 0
                      ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300'
                      : diff > 0
                      ? 'bg-amber-950/30 border-amber-800 text-amber-300'
                      : 'bg-red-950/30 border-red-800 text-red-300'
                  }`}
                >
                  <span>
                    {diff === 0
                      ? 'Cuadre Exacto'
                      : diff > 0
                      ? 'Sobrante en Caja (+)'
                      : 'Faltante en Caja (-)'}
                  </span>
                  <span>${diff.toFixed(2)} MXN</span>
                </div>
              );
            })()}

            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">
                Observaciones de Cierre (Opcional):
              </label>
              <input
                type="text"
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Ej. Todo en orden, cambio completo para el siguiente turno"
                className="w-full bg-[#100C08] border border-[#2E2419] rounded-xl px-4 py-2 text-xs text-stone-100 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCorteZ(false)}
                className="flex-1 py-2.5 bg-[#20180F] hover:bg-[#2A2016] text-stone-300 font-semibold rounded-xl text-xs border border-[#34271A]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCorteZ}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-stone-100 font-bold rounded-xl text-xs shadow-lg shadow-red-950/50"
              >
                Cerrar Turno Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

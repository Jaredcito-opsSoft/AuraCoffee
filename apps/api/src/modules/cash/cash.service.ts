import prisma from '../../db/prisma';
import { AppError } from '../../shared/middleware/error.middleware';
import { recordAuditLog } from '../../shared/utils/audit.utils';

export class CashService {
  async getRegisters() {
    return prisma.cashRegister.findMany({
      where: { isActive: true },
      include: {
        sessions: {
          where: { status: 'open' },
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async getCurrentSession(userId: number) {
    return prisma.cashSession.findFirst({
      where: {
        userId,
        status: 'open',
      },
      include: {
        cashRegister: true,
        movements: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { sales: true },
        },
      },
    });
  }

  async openSession(data: {
    userId: number;
    cashRegisterId: number;
    openingBalanceCents: number;
  }) {
    // 1. Check if user already has an open session
    const existingUserSession = await prisma.cashSession.findFirst({
      where: {
        userId: data.userId,
        status: 'open',
      },
    });

    if (existingUserSession) {
      throw new AppError('Ya tienes un turno de caja abierto.', 400, 'SESSION_ALREADY_OPEN');
    }

    // 2. Check if cash register is occupied
    const existingRegisterSession = await prisma.cashSession.findFirst({
      where: {
        cashRegisterId: data.cashRegisterId,
        status: 'open',
      },
      include: { user: true },
    });

    if (existingRegisterSession) {
      throw new AppError(
        `Esta caja ya está en uso por el usuario ${existingRegisterSession.user.name}`,
        400,
        'REGISTER_OCCUPIED'
      );
    }

    // 3. Create session
    const session = await prisma.cashSession.create({
      data: {
        cashRegisterId: data.cashRegisterId,
        userId: data.userId,
        openingBalanceCents: data.openingBalanceCents,
        expectedCashCents: data.openingBalanceCents,
        status: 'open',
      },
      include: {
        cashRegister: true,
      },
    });

    await recordAuditLog({
      userId: data.userId,
      action: 'cash_session_opened',
      entity: 'cash_sessions',
      entityId: session.id,
      details: { openingBalanceCents: data.openingBalanceCents },
    });

    return session;
  }

  async addMovement(data: {
    sessionId: number;
    userId: number;
    type: 'in_deposit' | 'out_withdrawal' | 'petty_cash_expense' | 'tip_payout';
    amountCents: number;
    reason: string;
  }) {
    const session = await prisma.cashSession.findUnique({
      where: { id: data.sessionId },
    });

    if (!session || session.status !== 'open') {
      throw new AppError('El turno de caja no está abierto', 400);
    }

    return prisma.$transaction(async (tx) => {
      const movement = await tx.cashMovement.create({
        data: {
          cashSessionId: data.sessionId,
          type: data.type,
          amountCents: data.amountCents,
          reason: data.reason,
          authorizedById: data.userId,
        },
      });

      // Update expected cash: in_deposit increases, out/expense decreases
      const isDeposit = data.type === 'in_deposit';
      const delta = isDeposit ? data.amountCents : -data.amountCents;

      await tx.cashSession.update({
        where: { id: data.sessionId },
        data: {
          expectedCashCents: { increment: delta },
        },
      });

      await recordAuditLog(
        {
          userId: data.userId,
          action: `cash_movement_${data.type}`,
          entity: 'cash_movements',
          entityId: movement.id,
          details: { amountCents: data.amountCents, reason: data.reason },
        },
        tx
      );

      return movement;
    });
  }

  /**
   * Corte X: Pre-cierre informativo para el cajero
   */
  async getCorteX(sessionId: number) {
    const session = await prisma.cashSession.findUnique({
      where: { id: sessionId },
      include: {
        cashRegister: true,
        user: { select: { name: true, email: true } },
        movements: true,
        sales: {
          where: { status: 'completed' },
          include: { payments: true },
        },
      },
    });

    if (!session) throw new AppError('Turno no encontrado', 404);

    const totalSalesCount = session.sales.length;
    const totalSalesCents = session.sales.reduce((sum, s) => sum + s.totalCents, 0);

    return {
      sessionId: session.id,
      cashier: session.user.name,
      registerName: session.cashRegister.name,
      openedAt: session.openedAt,
      openingBalanceCents: session.openingBalanceCents,
      expectedCashCents: session.expectedCashCents,
      totalCardCents: session.totalCardCents,
      totalTransferCents: session.totalTransferCents,
      totalTipsCents: session.totalTipsCents,
      totalSalesCount,
      totalSalesCents,
      movements: session.movements,
    };
  }

  /**
   * Corte Z: Cierre definitivo de turno con conteo ciego
   */
  async closeSession(data: {
    sessionId: number;
    userId: number;
    actualCashCents: number;
    closingNotes?: string;
  }) {
    const session = await prisma.cashSession.findUnique({
      where: { id: data.sessionId },
      include: {
        sales: { where: { status: 'completed' } },
        movements: true,
      },
    });

    if (!session || session.status !== 'open') {
      throw new AppError('El turno de caja no está abierto o no existe', 400);
    }

    const cashDifferenceCents = data.actualCashCents - session.expectedCashCents;

    const closed = await prisma.cashSession.update({
      where: { id: data.sessionId },
      data: {
        status: 'closed',
        actualCashCents: data.actualCashCents,
        cashDifferenceCents,
        closedAt: new Date(),
        closingNotes: data.closingNotes || null,
      },
      include: {
        cashRegister: true,
        user: { select: { id: true, name: true } },
      },
    });

    await recordAuditLog({
      userId: data.userId,
      action: 'cash_session_closed_corte_z',
      entity: 'cash_sessions',
      entityId: closed.id,
      details: {
        expectedCashCents: session.expectedCashCents,
        actualCashCents: data.actualCashCents,
        differenceCents: cashDifferenceCents,
      },
    });

    return closed;
  }
}

import prisma from '../../db/prisma';
import { generateAtomicFolio } from '../../shared/utils/folio.utils';
import { AppError } from '../../shared/middleware/error.middleware';
import { recordAuditLog } from '../../shared/utils/audit.utils';
import { SaleStatus } from '@prisma/client';

export interface PaymentInput {
  paymentMethod: 'cash' | 'card_debit' | 'card_credit' | 'transfer' | 'qr';
  amountCents: number;
  tipPortionCents?: number;
  reference?: string;
}

export interface CreateSaleInput {
  orderId?: number | null;
  customerId?: number | null;
  customerName?: string | null;
  subtotalCents: number;
  discountCents?: number;
  taxCents?: number;
  tipCents?: number;
  payments: PaymentInput[];
  notes?: string;
}

export class SalesService {
  async processSale(data: CreateSaleInput, cashierId: number) {
    if (!data.payments || data.payments.length === 0) {
      throw new AppError('Debe registrar al menos un método de pago', 400);
    }

    return prisma.$transaction(async (tx) => {
      // 1. Verify active Cash Session for cashier
      const activeSession = await tx.cashSession.findFirst({
        where: {
          userId: cashierId,
          status: 'open',
        },
      });

      if (!activeSession) {
        throw new AppError(
          'No hay un turno de caja abierto para este usuario. Debe abrir caja antes de cobrar.',
          400,
          'NO_ACTIVE_CASH_SESSION'
        );
      }

      // 2. Calculate sale totals
      const subtotalCents = data.subtotalCents;
      const discountCents = data.discountCents || 0;
      const taxCents = data.taxCents || 0;
      const tipCents = data.tipCents || 0;
      const totalCents = Math.max(0, subtotalCents - discountCents) + taxCents + tipCents;

      const totalPaidCents = data.payments.reduce((sum, p) => sum + p.amountCents, 0);

      if (totalPaidCents < totalCents) {
        throw new AppError(
          `Monto insuficiente: El total es $${(totalCents / 100).toFixed(2)} y se recibieron $${(totalPaidCents / 100).toFixed(2)}`,
          400,
          'INSUFFICIENT_PAYMENT'
        );
      }

      // Change calculation (only applies to cash payments)
      const cashPaymentsTotal = data.payments
        .filter((p) => p.paymentMethod === 'cash')
        .reduce((sum, p) => sum + p.amountCents, 0);

      const changeReturnedCents = Math.max(0, totalPaidCents - totalCents);

      // If change is greater than zero, verify it doesn't exceed cash paid
      if (changeReturnedCents > cashPaymentsTotal && cashPaymentsTotal > 0) {
        throw new AppError('El cambio a devolver no puede exceder el efectivo recibido', 400);
      }

      // 3. Generate sequential ticket folio TKT-xxxx
      const folio = await generateAtomicFolio(tx, 'ticket_sale', 'TKT-', 4);

      // 4. Create Sale and SalePayments
      const sale = await tx.sale.create({
        data: {
          folio,
          orderId: data.orderId || null,
          cashSessionId: activeSession.id,
          cashierId,
          customerId: data.customerId || null,
          customerName: data.customerName || null,
          subtotalCents,
          discountCents,
          taxCents,
          tipCents,
          totalCents,
          amountPaidCents: totalPaidCents,
          changeReturnedCents,
          status: 'completed',
          notes: data.notes || null,
          payments: {
            create: data.payments.map((p) => ({
              paymentMethod: p.paymentMethod,
              amountCents: p.amountCents,
              tipPortionCents: p.tipPortionCents || 0,
              reference: p.reference || null,
            })),
          },
        },
        include: {
          payments: true,
          cashier: { select: { id: true, name: true } },
          customer: true,
          order: {
            include: {
              items: {
                include: { product: true, variant: true, modifiers: true },
              },
              table: true,
            },
          },
        },
      });

      // 5. Update Cash Session running balances
      let sessionCashDelta = 0;
      let sessionCardDelta = 0;
      let sessionTransferDelta = 0;
      let sessionTipsDelta = tipCents;

      for (const p of data.payments) {
        if (p.paymentMethod === 'cash') {
          sessionCashDelta += p.amountCents - changeReturnedCents;
        } else if (p.paymentMethod === 'card_debit' || p.paymentMethod === 'card_credit') {
          sessionCardDelta += p.amountCents;
        } else if (p.paymentMethod === 'transfer' || p.paymentMethod === 'qr') {
          sessionTransferDelta += p.amountCents;
        }
      }

      await tx.cashSession.update({
        where: { id: activeSession.id },
        data: {
          expectedCashCents: { increment: sessionCashDelta },
          totalCardCents: { increment: sessionCardDelta },
          totalTransferCents: { increment: sessionTransferDelta },
          totalTipsCents: { increment: sessionTipsDelta },
        },
      });

      // 6. If linked to an order, close the order and free table
      if (data.orderId) {
        const order = await tx.order.findUnique({
          where: { id: data.orderId },
        });

        if (order) {
          await tx.order.update({
            where: { id: data.orderId },
            data: {
              status: 'paid',
              closedAt: new Date(),
            },
          });

          if (order.tableId) {
            await tx.restaurantTable.update({
              where: { id: order.tableId },
              data: { status: 'free', activeOrderId: null },
            });
          }
        }
      }

      // 7. Customer Loyalty: award 1 point for every 10 MXN (1000 cents) spent
      if (data.customerId) {
        const pointsEarned = Math.floor(totalCents / 1000);
        if (pointsEarned > 0) {
          await tx.customer.update({
            where: { id: data.customerId },
            data: {
              loyaltyPoints: { increment: pointsEarned },
              visitCount: { increment: 1 },
            },
          });
        }
      }

      // 8. Audit log
      await recordAuditLog(
        {
          userId: cashierId,
          action: 'sale_completed',
          entity: 'sales',
          entityId: sale.id,
          details: { folio: sale.folio, totalCents, changeReturnedCents },
        },
        tx
      );

      return sale;
    });
  }

  async getRecentSales(limit = 50) {
    return prisma.sale.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        cashier: { select: { name: true } },
        payments: true,
        order: {
          select: {
            folio: true,
            orderType: true,
            table: { select: { tableNumber: true } },
          },
        },
      },
    });
  }

  async getSaleById(id: number) {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        payments: true,
        cashier: { select: { id: true, name: true } },
        customer: true,
        order: {
          include: {
            items: {
              include: { product: true, variant: true, modifiers: true },
            },
            table: true,
          },
        },
        cashSession: {
          include: { cashRegister: true },
        },
      },
    });

    if (!sale) throw new AppError('Venta no encontrada', 404);
    return sale;
  }
}

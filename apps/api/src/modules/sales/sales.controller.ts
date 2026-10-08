import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SalesService } from './sales.service';

const salesService = new SalesService();

const paymentSchema = z.object({
  paymentMethod: z.enum(['cash', 'card_debit', 'card_credit', 'transfer', 'qr']),
  amountCents: z.number().int().positive(),
  tipPortionCents: z.number().int().nonnegative().optional(),
  reference: z.string().optional(),
});

const createSaleSchema = z.object({
  orderId: z.number().int().positive().nullable().optional(),
  customerId: z.number().int().positive().nullable().optional(),
  customerName: z.string().optional().nullable(),
  subtotalCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative().optional(),
  taxCents: z.number().int().nonnegative().optional(),
  tipCents: z.number().int().nonnegative().optional(),
  payments: z.array(paymentSchema).min(1, 'Se requiere al menos un método de pago'),
  notes: z.string().optional().nullable(),
});

export class SalesController {
  async processSale(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createSaleSchema.parse(req.body);
      const cashierId = req.user!.id;
      const sale = await salesService.processSale(data as any, cashierId);
      res.status(201).json({ success: true, data: sale });
    } catch (err) {
      next(err);
    }
  }

  async getRecent(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const sales = await salesService.getRecentSales(limit);
      res.json({ success: true, data: sales });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const sale = await salesService.getSaleById(id);
      res.json({ success: true, data: sale });
    } catch (err) {
      next(err);
    }
  }
}

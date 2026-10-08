import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrdersService } from './orders.service';
import { OrderStatus, KdsStatus } from '@prisma/client';

const ordersService = new OrdersService();

const createOrderSchema = z.object({
  orderType: z.enum(['dine_in', 'takeaway']),
  tableId: z.number().int().positive().nullable().optional(),
  customerName: z.string().optional().nullable(),
  guestCount: z.number().int().positive().default(1),
  notes: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        variantId: z.number().int().positive().nullable().optional(),
        quantity: z.number().int().positive(),
        notes: z.string().optional().nullable(),
        modifierIds: z.array(z.number().int().positive()).optional(),
      })
    )
    .min(1, 'La comanda debe contener al menos un producto'),
});

export class OrdersController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createOrderSchema.parse(req.body);
      const waiterId = req.user?.id;
      const order = await ordersService.createOrder(data as any, waiterId);
      res.status(201).json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }

  async getActive(req: Request, res: Response, next: NextFunction) {
    try {
      const tableId = req.query.tableId ? Number(req.query.tableId) : undefined;
      const status = req.query.status as OrderStatus | undefined;
      const orders = await ordersService.getActiveOrders({ tableId, status });
      res.json({ success: true, data: orders });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const order = await ordersService.getOrderById(id);
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const { status } = req.body;
      const updated = await ordersService.updateOrderStatus(id, status, req.user?.id);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async getKds(req: Request, res: Response, next: NextFunction) {
    try {
      const station = req.query.station as string | undefined;
      const orders = await ordersService.getKdsOrders(station);
      res.json({ success: true, data: orders });
    } catch (err) {
      next(err);
    }
  }

  async updateKdsItem(req: Request, res: Response, next: NextFunction) {
    try {
      const itemId = Number(req.params.itemId);
      const { status } = req.body as { status: KdsStatus };
      const updated = await ordersService.updateKdsItemStatus(itemId, status);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
}

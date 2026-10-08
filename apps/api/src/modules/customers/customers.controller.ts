import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CustomersService } from './customers.service';

const customersService = new CustomersService();

const createCustomerSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  phone: z.string().min(7, 'Teléfono debe tener al menos 7 dígitos'),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
});

export class CustomersController {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const q = (req.query.q as string) || '';
      const customers = await customersService.search(q);
      res.json({ success: true, data: customers });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createCustomerSchema.parse(req.body);
      const customer = await customersService.create(data as any);
      res.status(201).json({ success: true, data: customer });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const customer = await customersService.getById(id);
      res.json({ success: true, data: customer });
    } catch (err) {
      next(err);
    }
  }

  async redeem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const { points } = req.body;
      const updated = await customersService.redeemPoints(id, Number(points));
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
}

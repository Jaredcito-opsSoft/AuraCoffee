import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { InventoryService } from './inventory.service';

const inventoryService = new InventoryService();

const stockEntrySchema = z.object({
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  costCents: z.number().int().positive().optional(),
  reason: z.string().optional(),
  referenceId: z.string().optional(),
});

const wasteSchema = z.object({
  quantity: z.number().positive('La cantidad de merma debe ser mayor a 0'),
  reason: z.string().min(3, 'El motivo debe tener al menos 3 caracteres'),
});

const createItemSchema = z.object({
  name: z.string().min(2),
  sku: z.string().optional(),
  category: z.string().default('general'),
  unit: z.string().min(1),
  currentStock: z.number().nonnegative(),
  minimumStock: z.number().nonnegative(),
  costPerUnitCents: z.number().int().nonnegative(),
});

export class InventoryController {
  async getItems(req: Request, res: Response, next: NextFunction) {
    try {
      const category = req.query.category as string | undefined;
      const items = await inventoryService.getItems(category);
      res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }

  async getAlerts(_req: Request, res: Response, next: NextFunction) {
    try {
      const alerts = await inventoryService.getLowStockAlerts();
      res.json({ success: true, data: alerts });
    } catch (err) {
      next(err);
    }
  }

  async getMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const itemId = req.query.itemId ? Number(req.query.itemId) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const movements = await inventoryService.getMovements(itemId, limit);
      res.json({ success: true, data: movements });
    } catch (err) {
      next(err);
    }
  }

  async registerEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const itemId = Number(req.params.id);
      const data = stockEntrySchema.parse(req.body);
      const result = await inventoryService.registerStockEntry({
        itemId,
        userId: req.user?.id,
        ...data,
      });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async registerWaste(req: Request, res: Response, next: NextFunction) {
    try {
      const itemId = Number(req.params.id);
      const data = wasteSchema.parse(req.body);
      const result = await inventoryService.registerWaste({
        itemId,
        userId: req.user?.id,
        ...data,
      });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async createItem(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createItemSchema.parse(req.body);
      const item = await inventoryService.createItem(data);
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ProductsService } from './products.service';
import { PreparationStation } from '@prisma/client';

const productsService = new ProductsService();

const createProductSchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().min(2),
  description: z.string().optional(),
  sku: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  hasVariants: z.boolean().default(false),
  basePriceCents: z.number().int().nonnegative().default(0),
  baseCostCents: z.number().int().nonnegative().optional(),
  preparationStation: z.enum([
    'barista_hot',
    'barista_cold',
    'kitchen',
    'bakery_direct',
    'none',
  ]),
  isFavorite: z.boolean().optional(),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        priceCents: z.number().int().positive(),
        costCents: z.number().int().nonnegative().optional(),
      })
    )
    .optional(),
});

export class ProductsController {
  async getCategories(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await productsService.getCategories();
      res.json({ success: true, data: categories });
    } catch (err) {
      next(err);
    }
  }

  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
      const station = req.query.station as PreparationStation | undefined;
      const availableOnly = req.query.availableOnly === 'true';
      const search = req.query.search as string | undefined;

      const products = await productsService.getProducts({
        categoryId,
        station,
        availableOnly,
        search,
      });

      res.json({ success: true, data: products });
    } catch (err) {
      next(err);
    }
  }

  async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const product = await productsService.getProductById(id);
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  async toggleAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const updated = await productsService.toggleProductAvailability(id);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createProductSchema.parse(req.body);
      const product = await productsService.createProduct(data as any);
      res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }
}

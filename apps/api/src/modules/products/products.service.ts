import prisma from '../../db/prisma';
import { AppError } from '../../shared/middleware/error.middleware';
import { PreparationStation } from '@prisma/client';

export class ProductsService {
  async getCategories() {
    return prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async getProducts(params?: {
    categoryId?: number;
    station?: PreparationStation;
    availableOnly?: boolean;
    search?: string;
  }) {
    const where: any = {};

    if (params?.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (params?.station) {
      where.preparationStation = params.station;
    }

    if (params?.availableOnly) {
      where.isAvailable = true;
    }

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { sku: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return prisma.product.findMany({
      where,
      orderBy: [{ isFavorite: 'desc' }, { displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            colorHex: true,
            iconName: true,
          },
        },
        variants: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
        modifierGroupLinks: {
          include: {
            modifierGroup: {
              include: {
                modifiers: {
                  where: { isActive: true },
                  orderBy: { displayOrder: 'asc' },
                },
              },
            },
          },
        },
        recipes: {
          include: {
            ingredients: {
              include: {
                inventoryItem: true,
              },
            },
          },
        },
      },
    });
  }

  async getProductById(id: number) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
        modifierGroupLinks: {
          include: {
            modifierGroup: {
              include: {
                modifiers: {
                  where: { isActive: true },
                  orderBy: { displayOrder: 'asc' },
                },
              },
            },
          },
        },
        recipes: {
          include: {
            ingredients: {
              include: {
                inventoryItem: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new AppError('Producto no encontrado', 404);
    }

    return product;
  }

  async toggleProductAvailability(id: number) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new AppError('Producto no encontrado', 404);

    return prisma.product.update({
      where: { id },
      data: { isAvailable: !product.isAvailable },
    });
  }

  async createProduct(data: {
    categoryId: number;
    name: string;
    description?: string;
    sku?: string;
    imageUrl?: string;
    hasVariants: boolean;
    basePriceCents: number;
    baseCostCents?: number;
    preparationStation: PreparationStation;
    isFavorite?: boolean;
    variants?: Array<{
      name: string;
      priceCents: number;
      costCents?: number;
    }>;
  }) {
    const slug = data.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return prisma.product.create({
      data: {
        categoryId: data.categoryId,
        name: data.name,
        slug: `${slug}-${Date.now().toString(36)}`,
        description: data.description,
        sku: data.sku,
        imageUrl: data.imageUrl,
        hasVariants: data.hasVariants,
        basePriceCents: data.basePriceCents,
        baseCostCents: data.baseCostCents || 0,
        preparationStation: data.preparationStation,
        isFavorite: data.isFavorite || false,
        variants: data.hasVariants && data.variants
          ? {
              create: data.variants.map((v, idx) => ({
                name: v.name,
                priceCents: v.priceCents,
                costCents: v.costCents || 0,
                displayOrder: idx,
              })),
            }
          : undefined,
      },
      include: {
        variants: true,
        category: true,
      },
    });
  }

  async updateProduct(id: number, data: Partial<any>) {
    return prisma.product.update({
      where: { id },
      data,
    });
  }
}

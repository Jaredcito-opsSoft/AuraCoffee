import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import { AppError } from '../../shared/middleware/error.middleware';
import { recordAuditLog } from '../../shared/utils/audit.utils';

export class InventoryService {
  async getItems(category?: string) {
    const where: any = { isActive: true };
    if (category && category !== 'all') {
      where.category = category;
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // Add traffic-light status: 'critical' (red), 'warning' (yellow), 'optimal' (green)
    return items.map((item) => {
      const stock = Number(item.currentStock);
      const min = Number(item.minimumStock);
      let status: 'critical' | 'warning' | 'optimal' = 'optimal';

      if (stock <= min) {
        status = 'critical';
      } else if (stock <= min * 1.5) {
        status = 'warning';
      }

      return {
        ...item,
        currentStock: stock,
        minimumStock: min,
        status,
      };
    });
  }

  async getLowStockAlerts() {
    const all = await this.getItems();
    return all.filter((i) => i.status === 'critical' || i.status === 'warning');
  }

  async getMovements(itemId?: number, limit = 100) {
    const where: any = {};
    if (itemId) {
      where.inventoryItemId = itemId;
    }

    return prisma.inventoryMovement.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        inventoryItem: { select: { name: true, unit: true, sku: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async registerStockEntry(data: {
    itemId: number;
    quantity: number;
    costCents?: number;
    reason?: string;
    referenceId?: string;
    userId?: number;
  }) {
    if (data.quantity <= 0) throw new AppError('La cantidad debe ser mayor a 0', 400);

    return prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: data.itemId } });
      if (!item) throw new AppError('Insumo no encontrado', 404);

      const stockBefore = new Prisma.Decimal(item.currentStock.toString());
      const qtyDecimal = new Prisma.Decimal(data.quantity);
      const stockAfter = stockBefore.add(qtyDecimal);

      const updateData: any = { currentStock: stockAfter };
      if (data.costCents) {
        updateData.costPerUnitCents = data.costCents;
      }

      const updatedItem = await tx.inventoryItem.update({
        where: { id: item.id },
        data: updateData,
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryItemId: item.id,
          movementType: 'stock_entry',
          quantity: qtyDecimal,
          stockBefore,
          stockAfter,
          costCentsSnapshot: data.costCents || item.costPerUnitCents,
          referenceType: 'purchase_receipt',
          referenceId: data.referenceId || null,
          reason: data.reason || 'Reabastecimiento de insumos',
          createdById: data.userId || null,
        },
      });

      await recordAuditLog(
        {
          userId: data.userId,
          action: 'inventory_entry',
          entity: 'inventory_items',
          entityId: item.id,
          details: { quantity: data.quantity, stockAfter: stockAfter.toNumber() },
        },
        tx
      );

      return { item: updatedItem, movement };
    });
  }

  async registerWaste(data: {
    itemId: number;
    quantity: number;
    reason: string;
    userId?: number;
  }) {
    if (data.quantity <= 0) throw new AppError('La cantidad de merma debe ser mayor a 0', 400);
    if (!data.reason) throw new AppError('Debe indicar el motivo de la merma', 400);

    return prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: data.itemId } });
      if (!item) throw new AppError('Insumo no encontrado', 404);

      const stockBefore = new Prisma.Decimal(item.currentStock.toString());
      const qtyDecimal = new Prisma.Decimal(data.quantity);
      const stockAfter = stockBefore.sub(qtyDecimal);

      const updatedItem = await tx.inventoryItem.update({
        where: { id: item.id },
        data: { currentStock: stockAfter },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryItemId: item.id,
          movementType: 'waste_loss',
          quantity: qtyDecimal.negated(),
          stockBefore,
          stockAfter,
          costCentsSnapshot: item.costPerUnitCents,
          referenceType: 'waste_log',
          reason: data.reason,
          createdById: data.userId || null,
        },
      });

      await recordAuditLog(
        {
          userId: data.userId,
          action: 'inventory_waste',
          entity: 'inventory_items',
          entityId: item.id,
          details: { quantity: data.quantity, reason: data.reason },
        },
        tx
      );

      return { item: updatedItem, movement };
    });
  }

  async createItem(data: {
    name: string;
    sku?: string;
    category: string;
    unit: string;
    currentStock: number;
    minimumStock: number;
    costPerUnitCents: number;
  }) {
    return prisma.inventoryItem.create({
      data: {
        name: data.name,
        sku: data.sku,
        category: data.category,
        unit: data.unit,
        currentStock: new Prisma.Decimal(data.currentStock),
        minimumStock: new Prisma.Decimal(data.minimumStock),
        costPerUnitCents: data.costPerUnitCents,
      },
    });
  }
}

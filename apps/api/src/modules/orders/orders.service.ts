import { Prisma, OrderStatus, KdsStatus, OrderType } from '@prisma/client';
import prisma from '../../db/prisma';
import { generateAtomicFolio } from '../../shared/utils/folio.utils';
import { AppError } from '../../shared/middleware/error.middleware';
import { recordAuditLog } from '../../shared/utils/audit.utils';

export interface CreateOrderItemInput {
  productId: number;
  variantId?: number | null;
  quantity: number;
  notes?: string;
  modifierIds?: number[];
}

export interface CreateOrderInput {
  orderType: OrderType;
  tableId?: number | null;
  customerName?: string | null;
  guestCount?: number;
  notes?: string;
  items: CreateOrderItemInput[];
}

export class OrdersService {
  /**
   * Creates an order atomically:
   * 1. Generates sequential folio CMD-xxxx
   * 2. Calculates subtotal, item prices snapshot
   * 3. Deducts inventory using Recipe BOM + Modifier inventory linkages
   * 4. Creates immutable kardex movement records
   */
  async createOrder(data: CreateOrderInput, waiterId?: number) {
    if (!data.items || data.items.length === 0) {
      throw new AppError('La comanda debe contener al menos un producto', 400);
    }

    return prisma.$transaction(async (tx) => {
      // 1. Generate Folio
      const folio = await generateAtomicFolio(tx, 'order_command', 'CMD-', 4);

      // 2. Fetch all products and variants referenced
      const productIds = Array.from(new Set(data.items.map((i) => i.productId)));
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: {
          variants: true,
          recipes: {
            include: {
              ingredients: true,
            },
          },
        },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      // 3. Fetch all modifiers referenced
      const allModifierIds = data.items.flatMap((i) => i.modifierIds || []);
      const modifiers = allModifierIds.length > 0
        ? await tx.modifier.findMany({
            where: { id: { in: allModifierIds } },
          })
        : [];
      const modifierMap = new Map(modifiers.map((m) => [m.id, m]));

      // 4. Calculate items and line totals
      let orderSubtotalCents = 0;
      const orderItemsToCreate: any[] = [];
      const inventoryDeductions: Array<{
        inventoryItemId: number;
        deductQuantity: Prisma.Decimal;
        referenceId?: string;
      }> = [];

      for (const itemInput of data.items) {
        const product = productMap.get(itemInput.productId);
        if (!product) {
          throw new AppError(`Producto con ID ${itemInput.productId} no encontrado`, 404);
        }
        if (!product.isAvailable) {
          throw new AppError(`El producto '${product.name}' no está disponible`, 400);
        }

        let unitPriceCents = product.basePriceCents;
        let unitCostCents = product.baseCostCents;

        if (itemInput.variantId) {
          const variant = product.variants.find((v) => v.id === itemInput.variantId);
          if (!variant) {
            throw new AppError(`Variante no encontrada para ${product.name}`, 404);
          }
          unitPriceCents = variant.priceCents;
          unitCostCents = variant.costCents || unitCostCents;
        }

        // Modifiers for this item
        const itemModifiers = (itemInput.modifierIds || [])
          .map((id) => modifierMap.get(id))
          .filter(Boolean) as typeof modifiers;

        const modifiersExtraCents = itemModifiers.reduce((acc, m) => acc + m.extraPriceCents, 0);
        const itemSubtotalCents = (unitPriceCents + modifiersExtraCents) * itemInput.quantity;
        orderSubtotalCents += itemSubtotalCents;

        // BOM Recipe deduction calculation
        // Find matching recipe: first match variant recipe, fallback to product base recipe
        const recipe =
          product.recipes.find((r) => r.variantId === itemInput.variantId) ||
          product.recipes.find((r) => !r.variantId);

        if (recipe && recipe.ingredients) {
          for (const ing of recipe.ingredients) {
            const lossFactor = new Prisma.Decimal(1).add(
              new Prisma.Decimal(ing.lossPercentage.toString()).div(100)
            );
            const totalDeduct = new Prisma.Decimal(ing.quantity.toString())
              .mul(itemInput.quantity)
              .mul(lossFactor);

            inventoryDeductions.push({
              inventoryItemId: ing.inventoryItemId,
              deductQuantity: totalDeduct,
            });
          }
        }

        // Modifiers inventory deductions (e.g. oat milk, flavored syrup)
        for (const mod of itemModifiers) {
          if (mod.inventoryItemId && mod.deductQuantity) {
            const totalModDeduct = new Prisma.Decimal(mod.deductQuantity.toString()).mul(
              itemInput.quantity
            );
            inventoryDeductions.push({
              inventoryItemId: mod.inventoryItemId,
              deductQuantity: totalModDeduct,
            });
          }
        }

        orderItemsToCreate.push({
          productId: product.id,
          variantId: itemInput.variantId || null,
          quantity: itemInput.quantity,
          unitPriceCents,
          unitCostCents,
          subtotalCents: itemSubtotalCents,
          notes: itemInput.notes || null,
          kdsStation: product.preparationStation || 'barista_hot',
          kdsStatus: 'pending' as KdsStatus,
          modifiers: {
            create: itemModifiers.map((m) => ({
              modifierId: m.id,
              nameSnapshot: m.name,
              priceCents: m.extraPriceCents,
            })),
          },
        });
      }

      // 5. Create Order record
      const order = await tx.order.create({
        data: {
          folio,
          orderType: data.orderType,
          tableId: data.tableId || null,
          customerName: data.customerName || null,
          guestCount: data.guestCount || 1,
          waiterId: waiterId || null,
          notes: data.notes || null,
          subtotalCents: orderSubtotalCents,
          discountCents: 0,
          totalCents: orderSubtotalCents,
          status: 'open',
          items: {
            create: orderItemsToCreate,
          },
        },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
              modifiers: true,
            },
          },
          table: true,
        },
      });

      // Update table status if dine_in
      if (data.tableId) {
        await tx.restaurantTable.update({
          where: { id: data.tableId },
          data: { status: 'busy', activeOrderId: order.id },
        });
      }

      // 6. Apply atomic Inventory Deductions and Kardex entries
      for (const ded of inventoryDeductions) {
        const item = await tx.inventoryItem.findUnique({
          where: { id: ded.inventoryItemId },
        });

        if (item) {
          const stockBefore = new Prisma.Decimal(item.currentStock.toString());
          const stockAfter = stockBefore.sub(ded.deductQuantity);

          await tx.inventoryItem.update({
            where: { id: item.id },
            data: { currentStock: stockAfter },
          });

          await tx.inventoryMovement.create({
            data: {
              inventoryItemId: item.id,
              movementType: 'sale_consumption',
              quantity: ded.deductQuantity.negated(),
              stockBefore,
              stockAfter,
              costCentsSnapshot: item.costPerUnitCents,
              referenceType: 'order_command',
              referenceId: order.folio,
              reason: `Consumo comanda ${order.folio}`,
              createdById: waiterId || null,
            },
          });
        }
      }

      await recordAuditLog(
        {
          userId: waiterId,
          action: 'order_create',
          entity: 'orders',
          entityId: order.id,
          details: { folio: order.folio, totalCents: order.totalCents, itemsCount: order.items.length },
        },
        tx
      );

      return order;
    });
  }

  async getActiveOrders(filters?: { tableId?: number; status?: OrderStatus }) {
    const where: any = {
      status: filters?.status ? filters.status : { in: ['open', 'in_preparation', 'served'] },
    };

    if (filters?.tableId) {
      where.tableId = filters.tableId;
    }

    return prisma.order.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      include: {
        table: true,
        waiter: { select: { id: true, name: true } },
        items: {
          include: {
            product: true,
            variant: true,
            modifiers: true,
          },
        },
      },
    });
  }

  async getOrderById(id: number) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        table: true,
        waiter: { select: { id: true, name: true } },
        items: {
          include: {
            product: true,
            variant: true,
            modifiers: true,
          },
        },
        sales: {
          include: { payments: true },
        },
      },
    });

    if (!order) {
      throw new AppError('Comanda no encontrada', 404);
    }

    return order;
  }

  async updateOrderStatus(id: number, status: OrderStatus, userId?: number) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new AppError('Comanda no encontrada', 404);

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status,
        closedAt: status === 'paid' || status === 'cancelled' ? new Date() : undefined,
      },
    });

    // If order is closed or cancelled, free table
    if (order.tableId && (status === 'paid' || status === 'cancelled')) {
      await prisma.restaurantTable.update({
        where: { id: order.tableId },
        data: { status: 'free', activeOrderId: null },
      });
    }

    await recordAuditLog({
      userId,
      action: `order_status_${status}`,
      entity: 'orders',
      entityId: id,
    });

    return updated;
  }

  /**
   * KDS Feed: Active orders and tickets grouped for kitchen/barista stations
   */
  async getKdsOrders(station?: string) {
    const whereItem: any = {
      kdsStatus: { in: ['pending', 'preparing', 'ready'] },
    };

    if (station && station !== 'all') {
      whereItem.kdsStation = station;
    }

    const activeOrders = await prisma.order.findMany({
      where: {
        status: { in: ['open', 'in_preparation'] },
        items: {
          some: whereItem,
        },
      },
      orderBy: { openedAt: 'asc' }, // oldest orders first (FIFO)
      include: {
        table: true,
        waiter: { select: { name: true } },
        items: {
          where: whereItem,
          include: {
            product: true,
            variant: true,
            modifiers: true,
          },
        },
      },
    });

    return activeOrders;
  }

  /**
   * Update KDS Item status (pending -> preparing -> ready -> delivered)
   */
  async updateKdsItemStatus(itemId: number, newStatus: KdsStatus) {
    const item = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true },
    });

    if (!item) throw new AppError('Ítem de comanda no encontrado', 404);

    const updateData: any = { kdsStatus: newStatus };

    if (newStatus === 'preparing' && !item.preparationStartedAt) {
      updateData.preparationStartedAt = new Date();
      // Also update order status to in_preparation if was open
      if (item.order.status === 'open') {
        await prisma.order.update({
          where: { id: item.orderId },
          data: { status: 'in_preparation' },
        });
      }
    } else if (newStatus === 'ready' && !item.preparedAt) {
      updateData.preparedAt = new Date();
    } else if (newStatus === 'delivered' && !item.deliveredAt) {
      updateData.deliveredAt = new Date();
    }

    const updated = await prisma.orderItem.update({
      where: { id: itemId },
      data: updateData,
      include: { product: true, variant: true, modifiers: true },
    });

    return updated;
  }
}

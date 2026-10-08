import prisma from '../../db/prisma';

export class DashboardService {
  async getDailyKpis() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Sales today
    const salesToday = await prisma.sale.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: 'completed',
      },
      include: {
        payments: true,
      },
    });

    const totalSalesCents = salesToday.reduce((sum, s) => sum + s.totalCents, 0);
    const totalTicketsCount = salesToday.length;
    const averageTicketCents = totalTicketsCount > 0 ? Math.round(totalSalesCents / totalTicketsCount) : 0;
    const totalTipsCents = salesToday.reduce((sum, s) => sum + s.tipCents, 0);

    // Payment methods breakdown
    let cashCents = 0;
    let cardCents = 0;
    let transferCents = 0;

    for (const sale of salesToday) {
      for (const p of sale.payments) {
        if (p.paymentMethod === 'cash') cashCents += p.amountCents;
        else if (p.paymentMethod === 'card_debit' || p.paymentMethod === 'card_credit') cardCents += p.amountCents;
        else transferCents += p.amountCents;
      }
    }

    // 2. Active Tables
    const totalTables = await prisma.restaurantTable.count({ where: { isActive: true } });
    const busyTables = await prisma.restaurantTable.count({
      where: { isActive: true, status: 'busy' },
    });

    // 3. Low stock alerts count
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: { currentStock: true, minimumStock: true },
    });

    const lowStockCount = lowStockItems.filter(
      (item) => Number(item.currentStock) <= Number(item.minimumStock)
    ).length;

    // 4. Hourly sales curve
    const hourlySales: { [hour: number]: { count: number; totalCents: number } } = {};
    for (let h = 7; h <= 22; h++) {
      hourlySales[h] = { count: 0, totalCents: 0 };
    }

    for (const sale of salesToday) {
      const hour = new Date(sale.createdAt).getHours();
      if (hourlySales[hour]) {
        hourlySales[hour].count += 1;
        hourlySales[hour].totalCents += sale.totalCents;
      }
    }

    const hourlyChartData = Object.entries(hourlySales).map(([hour, data]) => ({
      hour: `${hour.padStart(2, '0')}:00`,
      tickets: data.count,
      sales: Math.round(data.totalCents / 100),
    }));

    // 5. Top 5 selling items
    const topItems = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, subtotalCents: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const topProductDetails = await Promise.all(
      topItems.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { name: true, category: { select: { name: true } } },
        });
        return {
          productId: item.productId,
          name: product?.name || 'Producto',
          category: product?.category.name || '',
          quantitySold: item._sum.quantity || 0,
          revenueCents: item._sum.subtotalCents || 0,
        };
      })
    );

    return {
      kpis: {
        totalSalesCents,
        totalSalesMxn: totalSalesCents / 100,
        totalTicketsCount,
        averageTicketCents,
        averageTicketMxn: averageTicketCents / 100,
        totalTipsCents,
        totalTipsMxn: totalTipsCents / 100,
        totalTables,
        busyTables,
        occupancyRate: totalTables > 0 ? Math.round((busyTables / totalTables) * 100) : 0,
        lowStockCount,
      },
      paymentBreakdown: {
        cashCents,
        cardCents,
        transferCents,
      },
      hourlyChartData,
      topProducts: topProductDetails,
    };
  }
}

import prisma from '../../db/prisma';
import { AppError } from '../../shared/middleware/error.middleware';

export class CustomersService {
  async search(query: string) {
    if (!query || query.trim().length < 2) return [];

    return prisma.customer.findMany({
      where: {
        isActive: true,
        OR: [
          { phone: { contains: query.trim() } },
          { name: { contains: query.trim(), mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: { visitCount: 'desc' },
    });
  }

  async create(data: { name: string; phone: string; email?: string; notes?: string }) {
    const existing = await prisma.customer.findUnique({
      where: { phone: data.phone },
    });

    if (existing) {
      throw new AppError('Ya existe un cliente registrado con ese número de teléfono', 409);
    }

    return prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        notes: data.notes || null,
        loyaltyPoints: 0,
        visitCount: 0,
      },
    });
  }

  async getById(id: number) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            folio: true,
            totalCents: true,
            createdAt: true,
          },
        },
      },
    });

    if (!customer) throw new AppError('Cliente no encontrado', 404);
    return customer;
  }

  async redeemPoints(customerId: number, pointsToRedeem: number) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) throw new AppError('Cliente no encontrado', 404);
    if (customer.loyaltyPoints < pointsToRedeem) {
      throw new AppError('Puntos insuficientes', 400);
    }

    return prisma.customer.update({
      where: { id: customerId },
      data: {
        loyaltyPoints: { decrement: pointsToRedeem },
      },
    });
  }
}

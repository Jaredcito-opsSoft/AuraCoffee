import { Prisma } from '@prisma/client';

export type FolioScope = 'ticket_sale' | 'order_command' | 'purchase_order';

/**
 * Generates an atomic sequential folio inside a database transaction.
 * Uses atomic counter increment to prevent duplicate numbers during concurrent requests.
 *
 * Example outputs:
 * - 'ticket_sale' -> 'TKT-0001', 'TKT-0002'
 * - 'order_command' -> 'CMD-0001', 'CMD-0002'
 */
export async function generateAtomicFolio(
  tx: Prisma.TransactionClient,
  scope: FolioScope,
  defaultPrefix: string = 'FOL-',
  padding: number = 4
): Promise<string> {
  const counter = await tx.folioCounter.upsert({
    where: { scope },
    update: {
      currentValue: { increment: 1 },
    },
    create: {
      scope,
      prefix: defaultPrefix,
      currentValue: 1,
      padding,
    },
  });

  const paddedNum = String(counter.currentValue).padStart(counter.padding || padding, '0');
  return `${counter.prefix}${paddedNum}`;
}

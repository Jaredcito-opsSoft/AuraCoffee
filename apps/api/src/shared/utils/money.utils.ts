/**
 * Money utilities — strictly working with integer cents (centavos)
 * Rule: All monetary calculations in BrewDesk are done in integer cents to prevent floating point errors.
 */

export function formatCents(cents: number, currency = 'MXN'): string {
  const amount = (cents || 0) / 100;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return (cents || 0) / 100;
}

export interface OrderTotalsCalculation {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
}

export function calculateOrderTotals(params: {
  items: Array<{ unitPriceCents: number; quantity: number; modifiersExtraCents?: number }>;
  discountCents?: number;
  taxPercentage?: number; // e.g. 0.16 for 16% or 0
  tipCents?: number;
}): OrderTotalsCalculation {
  const subtotalCents = params.items.reduce((sum, item) => {
    const itemTotal = (item.unitPriceCents + (item.modifiersExtraCents || 0)) * item.quantity;
    return sum + itemTotal;
  }, 0);

  const discountCents = Math.min(params.discountCents || 0, subtotalCents);
  const taxableBase = Math.max(0, subtotalCents - discountCents);
  const taxCents = params.taxPercentage ? Math.round(taxableBase * params.taxPercentage) : 0;
  const tipCents = params.tipCents || 0;
  const totalCents = taxableBase + taxCents + tipCents;

  return {
    subtotalCents,
    discountCents,
    taxCents,
    tipCents,
    totalCents,
  };
}

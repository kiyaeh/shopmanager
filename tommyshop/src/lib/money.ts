import Decimal from 'decimal.js';

export { Decimal };

export const ZERO = new Decimal(0);

export function toDecimal(value: number | string | Decimal): Decimal {
  return new Decimal(value);
}

export function formatETB(value: Decimal | number | string, decimalPlaces = 2): string {
  const d = new Decimal(value);
  // Format with thousands separator and fixed decimal places
  // e.g. 1234.5 → "1,234.50"
  const fixed = d.toFixed(decimalPlaces);
  const [intPart, fracPart] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fracPart !== undefined ? `${withCommas}.${fracPart}` : withCommas;
}

export function sumDecimals(values: Decimal[]): Decimal {
  return values.reduce((acc, v) => acc.add(v), ZERO);
}

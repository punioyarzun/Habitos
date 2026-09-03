export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidColor(v: unknown): v is string {
  return typeof v === 'string' && HEX_COLOR_RE.test(v);
}

export function cleanFreeText(v: unknown, maxLen: number): string {
  if (typeof v !== 'string') return '';
  return v.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

export function isPositiveFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

export const SWATCH_COLORS = [
  '#6366f1', '#0ea5e9', '#14b8a6', '#10b981', '#f59e0b',
  '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#64748b',
];

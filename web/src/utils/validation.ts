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
  '#5b9bd9', '#e07a5f', '#9b8ce0', '#e8b93d', '#4fae8e',
  '#e1636b', '#77b6ea', '#f4a259', '#c77dff', '#34b76a',
];

export const DEFAULT_ICONS = ['⭐', '🏃', '📚', '💧', '🧘', '💻', '🚭', '🥗', '🌙', '💰', '🎯', '🚫'];

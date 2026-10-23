export const fmt = n => Math.round(n).toLocaleString('en-US');
export const ordinal = n => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');

export const MOTION = typeof window !== 'undefined' && window.matchMedia
  ? !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;
export const DEAL_STEP = 110;

export function seatPos(i, n, rx, ry, offsetDeg = 0) {
  const a = (90 + i * 360 / n + offsetDeg) * Math.PI / 180;
  return { x: 50 + rx * Math.cos(a), y: 50 + ry * Math.sin(a) };
}

export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { if (v === null || v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

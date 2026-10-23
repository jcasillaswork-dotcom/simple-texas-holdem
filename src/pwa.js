// Service worker registration. New versions wait for the player to reload,
// so an update never interrupts a hand.
import { registerSW } from 'virtual:pwa-register';

const listeners = new Set();
let pending = false;
const updateSW = registerSW({
  onNeedRefresh() { pending = true; listeners.forEach(fn => fn()); },
});

export function onUpdate(fn) { listeners.add(fn); if (pending) fn(); return () => listeners.delete(fn); }
export function applyUpdate() { updateSW(true); }

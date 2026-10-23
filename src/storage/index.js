// Pick where accounts are stored. Set VITE_STORAGE=server (and optionally VITE_API_URL) to use your own server.
import { createLocalStorage } from './local.js';
import { createRemoteStorage } from './remote.js';

export const storage = import.meta.env.VITE_STORAGE === 'server'
  ? createRemoteStorage(import.meta.env.VITE_API_URL || '')
  : createLocalStorage();

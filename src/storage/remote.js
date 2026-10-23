// Server storage: accounts live on your own server (see /server), so they work on any device.
// Works offline too: the last signed-in account is cached and profile changes are queued until the server is reachable.
import { store } from '../util.js';
import { authError } from './crypto.js';

const TOKEN = 'holdem-token';
const CACHED = 'holdem-cached-account';
const PENDING = 'holdem-pending-profile';
const KNOWN = 'holdem-known-accounts';

export function createRemoteStorage(base = '') {
  let chain = Promise.resolve();

  async function api(path, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = store.get(TOKEN, null);
    if (token) headers.Authorization = 'Bearer ' + token;
    let res;
    try {
      res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch (e) {
      throw Object.assign(authError('form', 'Can’t reach the server. Check your connection and try again.'), { offline: true });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const d = data.detail || {};
      throw Object.assign(authError(d.field || 'form', d.msg || (typeof data.detail === 'string' ? data.detail : 'Something went wrong. Try again.')), { status: res.status });
    }
    return data;
  }

  const remember = account => {
    store.set(CACHED, account);
    const known = store.get(KNOWN, []).filter(k => k.username.toLowerCase() !== account.username.toLowerCase());
    store.set(KNOWN, [{ username: account.username, profile: { name: account.profile.name, avatar: account.profile.avatar } }, ...known].slice(0, 8));
  };

  async function flush() {
    const p = store.get(PENDING, null);
    if (!p || !store.get(TOKEN, null)) return;
    await api('/api/me/profile', { method: 'PUT', body: { profile: p } });
    if (JSON.stringify(store.get(PENDING, null)) === JSON.stringify(p)) store.set(PENDING, null);
  }
  if (typeof window !== 'undefined') window.addEventListener('online', () => { chain = chain.then(flush).catch(() => {}); });

  return {
    mode: 'server',
    async init() {
      if (!store.get(TOKEN, null)) return null;
      try {
        await flush();
        const a = await api('/api/me');
        remember(a);
        return a;
      } catch (e) {
        if (e.offline) return store.get(CACHED, null); // keep playing offline
        store.set(TOKEN, null); store.set(CACHED, null);
        return null;
      }
    },
    listKnown() { return store.get(KNOWN, []); },
    async register({ username, password, profile }) {
      const r = await api('/api/register', { method: 'POST', body: { username, password, profile } });
      store.set(TOKEN, r.token); remember(r.account);
      return r.account;
    },
    async login(username, password) {
      const r = await api('/api/login', { method: 'POST', body: { username: username.trim(), password } });
      store.set(TOKEN, r.token); remember(r.account);
      return r.account;
    },
    async logout() {
      try { await flush(); await api('/api/logout', { method: 'POST' }); } catch (e) {}
      store.set(TOKEN, null); store.set(CACHED, null); store.set(PENDING, null);
    },
    saveProfile(username, profile) {
      store.set(PENDING, profile);
      store.set(CACHED, { username, profile });
      chain = chain.then(flush).catch(() => {}); // stays queued if offline
      return chain;
    },
  };
}

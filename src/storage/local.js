// Local storage: every account lives in this browser only. Good for one device or a shared family device.
import { store } from '../util.js';
import { hashPassword, authError } from './crypto.js';

const ACCOUNTS = 'holdem-accounts';
const SESSION = 'holdem-session';
const read = () => store.get(ACCOUNTS, null) || { v: 2, users: {} };
const write = r => store.set(ACCOUNTS, r);
const pub = u => ({ username: u.username, profile: u.profile });

export function createLocalStorage() {
  return {
    mode: 'local',
    async init() {
      const key = store.get(SESSION, null);
      const u = key && read().users[key];
      return u ? pub(u) : null;
    },
    listKnown() { return Object.values(read().users).map(pub); },
    async register({ username, password, profile }) {
      const key = username.toLowerCase();
      if (read().users[key]) throw authError('username', 'That username is taken. Pick another, or log in instead.');
      const { salt, hash } = await hashPassword(password);
      const r = read();
      r.users[key] = { username, salt, hash, created: Date.now(), profile };
      write(r); store.set(SESSION, key);
      return pub(r.users[key]);
    },
    async login(username, password) {
      const key = username.trim().toLowerCase();
      const u = read().users[key];
      if (!u) throw authError('username', 'There’s no account with that username. Check the spelling, or create an account.');
      const { hash } = await hashPassword(password, u.salt);
      if (hash !== u.hash) throw authError('password', 'That password doesn’t match this account. Try again.');
      store.set(SESSION, key);
      return pub(u);
    },
    async logout() { store.set(SESSION, null); },
    async saveProfile(username, profile) {
      const r = read(); const key = username.toLowerCase();
      if (r.users[key]) { r.users[key].profile = profile; write(r); }
    },
  };
}

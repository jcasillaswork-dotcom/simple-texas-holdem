import { useCallback, useEffect, useState } from 'react';

export function useAccounts(storage) {
  const [account, setAccount] = useState(null);
  const [ready, setReady] = useState(false);
  const [known, setKnown] = useState(() => storage.listKnown());

  useEffect(() => {
    let dead = false;
    storage.init().then(a => { if (!dead) { setAccount(a); setReady(true); } })
      .catch(() => { if (!dead) setReady(true); });
    return () => { dead = true; };
  }, [storage]);

  const updateProfile = useCallback(fn => {
    setAccount(a => {
      if (!a) return a;
      const np = fn(a.profile);
      if (!np || np === a.profile) return a;
      storage.saveProfile(a.username, np);
      return { ...a, profile: np };
    });
  }, [storage]);

  const register = async data => { const a = await storage.register(data); setAccount(a); setKnown(storage.listKnown()); };
  const login = async (u, p) => { const a = await storage.login(u, p); setAccount(a); setKnown(storage.listKnown()); };
  const logout = async () => { await storage.logout(); setAccount(null); setKnown(storage.listKnown()); };

  return { account, profile: account ? account.profile : null, ready, known, mode: storage.mode, updateProfile, register, login, logout };
}

export function useNarrow() {
  const q = '(max-width: 640px)';
  const [n, setN] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q); const h = e => setN(e.matches);
    m.addEventListener('change', h); return () => m.removeEventListener('change', h);
  }, []);
  return n;
}

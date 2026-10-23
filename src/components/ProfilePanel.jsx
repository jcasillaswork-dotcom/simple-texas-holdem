import { useEffect, useState } from 'react';
import Avatar from './Avatar.jsx';
import AvatarPicker from './AvatarPicker.jsx';
import { blankStats, cleanName } from '../profile.js';
import { fmt, ordinal } from '../util.js';

export default function ProfilePanel({ profile, username, mode, onSave, onClose, onReset, onLogout }) {
  const [name, setName] = useState(profile.name);
  const [av, setAv] = useState(profile.avatar);
  const [confirmReset, setConfirmReset] = useState(false);
  const n = cleanName(name);
  const changed = n !== profile.name || av.color !== profile.avatar.color || av.emblem !== profile.avatar.emblem;
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  const st = { ...blankStats(), ...profile.stats };
  const rate = st.games ? Math.round(st.wins / st.games * 100) + '%' : '–';
  const submit = () => { if (n && changed) onSave(n, av); };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="profile-title">
      <div className="modal wide">
        <h2 id="profile-title">Your profile</h2>
        <p className="signed">Logged in as {username}</p>
        <div className="preview"><Avatar av={av} name={n || '?'} size={56} /><strong>{n || 'Your name'}</strong></div>
        <label className="field"><span>Name at the table</span>
          <input className="text" type="text" maxLength={18} value={name} autoComplete="nickname"
            onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
        </label>
        <AvatarPicker av={av} setAv={setAv} initial={n} />

        <h3>Your results</h3>
        <div className="statgrid">
          <div className="stat"><b>{fmt(st.games)}</b><span>Games played</span></div>
          <div className="stat"><b>{fmt(st.wins)}</b><span>Games won</span></div>
          <div className="stat"><b>{rate}</b><span>Win rate</span></div>
          <div className="stat"><b>{st.best ? ordinal(st.best) : '–'}</b><span>Best finish</span></div>
          <div className="stat"><b>{fmt(st.hands)}</b><span>Hands played</span></div>
          <div className="stat"><b>{fmt(st.handsWon)}</b><span>Hands won</span></div>
          <div className="stat"><b>{fmt(st.biggestPot)}</b><span>Biggest pot</span></div>
        </div>
        {profile.history && profile.history.length ? (
          <>
            <h3>Recent games</h3>
            <ol className="history">{profile.history.slice(0, 8).map((g, i) => (
              <li key={i}>
                <span>{g.place === 1 ? 'Won' : `${ordinal(g.place)} of ${g.players}`} in {g.hands} hands</span>
                <span>{new Date(g.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </li>
            ))}</ol>
          </>
        ) : <p className="note">Finish a game to see it here.</p>}
        <p className="note">{mode === 'server' ? 'Saved on your server, so it’s there on any device you log in from.' : 'Saved on this device.'}</p>

        <div className="row">
          <button className="btn" onClick={onLogout}>Log out</button>
          <button className="btn danger" onClick={() => { if (confirmReset) { onReset(); setConfirmReset(false); } else setConfirmReset(true); }}>
            {confirmReset ? 'Tap again to reset results' : 'Reset results'}
          </button>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn raise" disabled={!n || !changed} onClick={submit}>Save changes</button>
        </div>
      </div>
    </div>
  );
}

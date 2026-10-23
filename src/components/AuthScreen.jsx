import { useRef, useState } from 'react';
import Avatar from './Avatar.jsx';
import AvatarPicker from './AvatarPicker.jsx';
import { AV_COLORS, USERNAME_RE, cleanName, newProfile } from '../profile.js';

function Field({ label, err, children }) {
  return <label className="field"><span>{label}</span>{children}{err && <p className="err" role="alert">{err}</p>}</label>;
}

export default function AuthScreen({ known, mode: storageMode, onLogin, onRegister }) {
  const [mode, setMode] = useState(known.length || storageMode === 'server' ? 'login' : 'register');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [lu, setLu] = useState(known.length === 1 ? known[0].username : '');
  const [lp, setLp] = useState('');
  const pwRef = useRef(null);
  const [ru, setRu] = useState(''), [rn, setRn] = useState(''), [rp, setRp] = useState(''), [rc, setRc] = useState('');
  const [av, setAv] = useState({ color: AV_COLORS[0], emblem: 'initial' });

  const fail = e => setErr({ field: e.field || 'form', msg: e.msg || e.message || 'Something went wrong. Try again.' });
  const switchTo = m => { setMode(m); setErr(null); };

  const doLogin = async () => {
    if (busy) return;
    if (!lu.trim()) return setErr({ field: 'username', msg: 'Enter your username.' });
    if (!lp) return setErr({ field: 'password', msg: 'Enter your password.' });
    setBusy(true); setErr(null);
    try { await onLogin(lu, lp); } catch (e) { fail(e); if (e.field === 'password') setLp(''); setBusy(false); }
  };
  const doRegister = async () => {
    if (busy) return;
    const u = ru.trim();
    if (!USERNAME_RE.test(u)) return setErr({ field: 'username', msg: 'Use 3 to 20 letters, numbers, dashes or underscores.' });
    if (rp.length < 6) return setErr({ field: 'password', msg: 'Use at least 6 characters.' });
    if (rp !== rc) return setErr({ field: 'confirm', msg: 'The passwords don’t match.' });
    setBusy(true); setErr(null);
    try { await onRegister({ username: u, password: rp, profile: newProfile(cleanName(rn) || u, av) }); } catch (e) { fail(e); setBusy(false); }
  };
  const enter = fn => e => { if (e.key === 'Enter') fn(); };
  const e = f => (err && err.field === f ? err.msg : null);
  const shown = cleanName(rn) || ru.trim();
  const note = storageMode === 'server'
    ? 'Your account is stored on your server, so you can log in from any device.'
    : 'Accounts are saved on this device. Passwords are hashed, but this is casual protection, so don’t reuse an important password.';

  if (mode === 'login') return (
    <div className="overlay auth" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="modal">
        <h2 id="auth-title">Log in</h2>
        <p>Pick up where you left off at the table.</p>
        {known.length > 1 && (
          <div className="accounts" role="group" aria-label="Accounts on this device">{known.map(a => (
            <button key={a.username} type="button" aria-pressed={lu.toLowerCase() === a.username.toLowerCase()}
              onClick={() => { setLu(a.username); setErr(null); setTimeout(() => pwRef.current && pwRef.current.focus(), 0); }}>
              <Avatar av={a.profile.avatar} name={a.profile.name} size={32} />{a.profile.name}
            </button>
          ))}</div>
        )}
        <Field label="Username" err={e('username')}>
          <input className="text" type="text" value={lu} autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus={!lu}
            aria-invalid={!!e('username')} onChange={x => setLu(x.target.value)} onKeyDown={enter(doLogin)} />
        </Field>
        <Field label="Password" err={e('password')}>
          <input className="text" type="password" value={lp} ref={pwRef} autoComplete="current-password" autoFocus={!!lu}
            aria-invalid={!!e('password')} onChange={x => setLp(x.target.value)} onKeyDown={enter(doLogin)} />
        </Field>
        {e('form') && <p className="err" role="alert">{e('form')}</p>}
        <div className="row">
          <button className="linkbtn" type="button" onClick={() => switchTo('register')}>Create an account</button>
          <span className="spacer" />
          <button className="btn raise" disabled={busy} onClick={doLogin}>{busy ? 'Logging in…' : 'Log in'}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="overlay auth" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="modal wide">
        <h2 id="auth-title">Create an account</h2>
        <p>Your account keeps your seat, your look and your results.</p>
        <div className="preview"><Avatar av={av} name={shown || '?'} size={56} /><strong>{shown || 'Your name'}</strong></div>
        <div className="twocol">
          <Field label="Username" err={e('username')}>
            <input className="text" type="text" maxLength={20} value={ru} autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus
              aria-invalid={!!e('username')} onChange={x => setRu(x.target.value)} onKeyDown={enter(doRegister)} />
          </Field>
          <Field label="Name at the table">
            <input className="text" type="text" maxLength={18} value={rn} placeholder="Same as username" autoComplete="nickname"
              onChange={x => setRn(x.target.value)} onKeyDown={enter(doRegister)} />
          </Field>
          <Field label="Password" err={e('password')}>
            <input className="text" type="password" value={rp} autoComplete="new-password"
              aria-invalid={!!e('password')} onChange={x => setRp(x.target.value)} onKeyDown={enter(doRegister)} />
          </Field>
          <Field label="Confirm password" err={e('confirm')}>
            <input className="text" type="password" value={rc} autoComplete="new-password"
              aria-invalid={!!e('confirm')} onChange={x => setRc(x.target.value)} onKeyDown={enter(doRegister)} />
          </Field>
        </div>
        <AvatarPicker av={av} setAv={setAv} initial={shown} />
        <p className="note">{note}</p>
        {e('form') && <p className="err" role="alert">{e('form')}</p>}
        <div className="row">
          <button className="linkbtn" type="button" onClick={() => switchTo('login')}>I already have an account</button>
          <span className="spacer" />
          <button className="btn raise" disabled={busy} onClick={doRegister}>{busy ? 'Creating account…' : 'Create account'}</button>
        </div>
      </div>
    </div>
  );
}

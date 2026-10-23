import { useEffect, useState } from 'react';
import { BOTS } from '../engine/bots.js';
import { HANDS_PER_LEVEL } from '../engine/game.js';

export default function Setup({ settings, onStart, onClose, hasGame }) {
  const [s, setS] = useState(settings);
  useEffect(() => {
    const h = e => { if (e.key === 'Escape' && hasGame) onClose(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [hasGame, onClose]);
  const seg = (key, opts) => (
    <div className="seg">{opts.map(([v, l]) => (
      <button type="button" key={String(v)} aria-pressed={s[key] === v} onClick={() => setS({ ...s, [key]: v })}>{l}</button>
    ))}</div>
  );
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="setup-title">
      <div className="modal">
        <h2 id="setup-title">{hasGame ? 'Start a new game' : 'Take a seat'}</h2>
        <p>No-limit Texas Hold’em against computer players. Blinds go up every {HANDS_PER_LEVEL} hands, and the last stack standing wins.</p>
        <fieldset><legend>Opponents</legend>{seg('bots', [1, 2, 3, 4, 5].map(v => [v, String(v)]))}</fieldset>
        <p className="who">{BOTS.slice(0, s.bots).map(b => `${b.name}: ${b.style.toLowerCase()}`).join('. ')}.</p>
        <fieldset><legend>Starting chips</legend>{seg('stack', [[500, '500'], [1000, '1,000'], [2000, '2,000'], [5000, '5,000']])}</fieldset>
        <fieldset><legend>Opponent speed</legend>{seg('speed', [['relaxed', 'Relaxed'], ['normal', 'Normal'], ['fast', 'Fast']])}</fieldset>
        <div className="row">
          {hasGame && <button className="btn" onClick={onClose}>Keep playing</button>}
          <button className="btn raise" onClick={() => onStart(s)} autoFocus>Deal me in</button>
        </div>
      </div>
    </div>
  );
}

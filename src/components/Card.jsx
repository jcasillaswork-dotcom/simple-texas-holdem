import { useEffect, useRef, useState } from 'react';
import { RN, SUIT, SUIT_NAME, isRed, rl } from '../engine/cards.js';

// One playing card. Deals in from (dx, dy) and flips face-up once `up` is true and its face is known.
export default function Card({ c, up, dx = 0, dy = 0, delay = 0, flipAfter = 0, mucked = false, board = false, i = 0 }) {
  const [flip, setFlip] = useState(false);
  const mountedAt = useRef(performance.now());
  useEffect(() => {
    if (up && c) {
      const wait = Math.max(0, mountedAt.current + flipAfter - performance.now());
      if (wait <= 0) { const r = requestAnimationFrame(() => setFlip(true)); return () => cancelAnimationFrame(r); }
      const t = setTimeout(() => setFlip(true), wait); return () => clearTimeout(t);
    }
    setFlip(false);
  }, [up, !!c]);

  const cls = 'card' + (c && isRed(c.s) ? ' red' : '') + (mucked ? ' mucked' : '') + (board ? ' from-left' : '');
  return (
    <div className={cls} style={{ '--dx': dx + 'px', '--dy': dy + 'px', '--i': i, animationDelay: delay + 'ms' }}
      role="img" aria-label={flip && c ? `${RN[c.r]} of ${SUIT_NAME[c.s]}` : 'Face-down card'}>
      <div className={'card-inner' + (flip ? ' up' : '')}>
        <div className="face front">
          {c && <><span className="rk">{rl(c.r)}</span><span className="st">{SUIT[c.s]}</span><span className="big" aria-hidden="true">{SUIT[c.s]}</span></>}
        </div>
        <div className="face back cardback" />
      </div>
    </div>
  );
}

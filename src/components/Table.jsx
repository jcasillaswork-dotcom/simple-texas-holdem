import { useLayoutEffect, useRef, useState } from 'react';
import Card from './Card.jsx';
import Chips from './Chips.jsx';
import Seat from './Seat.jsx';
import { potTotal } from '../engine/game.js';
import { fmt, seatPos, MOTION } from '../util.js';

export default function Table({ game, narrow, me }) {
  const wrapRef = useRef(null), deckRef = useRef(null), potRef = useRef(null);
  const [geo, setGeo] = useState(null);

  // Measure the deck and pot so cards and chips can fly between them and the seats.
  useLayoutEffect(() => {
    const measure = () => {
      if (!wrapRef.current || !deckRef.current || !potRef.current) return;
      const w = wrapRef.current.getBoundingClientRect(), d = deckRef.current.getBoundingClientRect(), p = potRef.current.getBoundingClientRect();
      setGeo({ W: w.width, H: w.height, dX: d.left + d.width / 2 - w.left, dY: d.top + d.height / 2 - w.top, pX: p.left + p.width / 2 - w.left, pY: p.top + p.height / 2 - w.top });
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const G = geo || { W: 0, H: 0, dX: 0, dY: 0, pX: 0, pY: 0 };
  const px = pos => ({ x: pos.x / 100 * G.W, y: pos.y / 100 * G.H });
  const players = game ? game.players : [];
  const n = players.length;
  const rx = narrow ? 37 : 45, ry = narrow ? 45 : 43;
  const betPos = i => seatPos(i, n, rx * 0.62, ry * 0.56);
  const pot = game ? potTotal(game) : 0;
  const collected = pot - players.reduce((s, p) => s + p.bet, 0);
  const handover = !!game && game.phase === 'handover';
  const dealOrder = {}; let nDealt = 0;
  if (game) for (let j = 1; j <= n; j++) { const idx = (game.dealer + j) % n; if (players[idx].hole.length) dealOrder[idx] = nDealt++; }

  return (
    <div className="table-wrap" ref={wrapRef}>
      <div className="leather" /><div className="wood" /><div className="felt" />
      <div className="center">
        <div className={'potwrap' + (handover ? ' paid' : '')}>
          <div className="potchips" ref={potRef}>{collected > 0 && <Chips amt={collected} size={24} />}</div>
          <div className="pot">{pot > 0 ? `Pot ${fmt(pot)}` : '\u00a0'}</div>
        </div>
        <div className="board">
          <div className="deck" ref={deckRef} aria-hidden="true"><span className="cardback" /><span className="cardback" /><span className="cardback" /></div>
          {[0, 1, 2, 3, 4].map(i => {
            if (!(game && game.board[i])) return <div key={'s' + i} className="slot" />;
            const d = MOTION ? 280 + (i < 3 ? i : 0) * 130 : 0;
            return <Card key={'c' + game.handNum + '-' + i} c={game.board[i]} up board i={i} delay={d} flipAfter={MOTION ? d + 380 : 0} />;
          })}
        </div>
        <div className="result" aria-live="polite">{game && game.result && game.result.lines.map((l, i) => <div key={i}>{l}</div>)}</div>
      </div>

      {players.map((p, i) => {
        const pos = seatPos(i, n, rx, ry), bp = betPos(i);
        const s = px(pos), b = px(bp);
        return [
          <Seat key={'seat' + i} p={p} i={i} game={game} pos={pos} dx={G.dX - s.x} dy={G.dY - (s.y - 30)} order={dealOrder[i]} nDealt={nDealt} me={me} />,
          p.bet > 0 && (
            <div key={'bet' + i + '-' + game.handNum + '-' + game.street} className="bet"
              style={{ left: bp.x + '%', top: bp.y + '%', '--fx': (s.x - b.x) + 'px', '--fy': (s.y - b.y) + 'px' }}>
              <Chips amt={p.bet} /><span>{fmt(p.bet)}</span>
            </div>
          ),
        ];
      })}

      {game && game.sweep && game.sweep.items.map(it => {
        const bp = betPos(it.seat), b = px(bp);
        return <div key={'sw' + game.sweep.id + '-' + it.seat} className="fly"
          style={{ left: bp.x + '%', top: bp.y + '%', '--tx': (G.pX - b.x) + 'px', '--ty': (G.pY - b.y) + 'px' }}><Chips amt={it.amt} /></div>;
      })}
      {game && game.payout && game.payout.items.map(it => {
        const s = px(seatPos(it.seat, n, rx, ry));
        return <div key={'po' + game.payout.id + '-' + it.seat} className="fly payout"
          style={{ left: G.pX, top: G.pY, '--tx': (s.x - G.pX) + 'px', '--ty': (s.y - G.pY) + 'px' }}><Chips amt={it.amt} size={24} /></div>;
      })}
      {game && (() => {
        const d = seatPos(game.dealer, n, rx * 0.7, ry * 0.64, n > 2 ? 18 : 22);
        return <div className="dealer" style={{ left: d.x + '%', top: d.y + '%' }} title="Dealer button">D</div>;
      })()}
    </div>
  );
}

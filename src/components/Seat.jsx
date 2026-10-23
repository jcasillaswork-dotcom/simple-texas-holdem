import Card from './Card.jsx';
import Avatar from './Avatar.jsx';
import { cardText } from '../engine/cards.js';
import { fmt, MOTION, DEAL_STEP } from '../util.js';

export default function Seat({ p, i, game, pos, dx, dy, order, nDealt, me }) {
  const active = game.phase === 'betting' && game.toAct === i;
  const win = !!(game.result && game.result.winners.includes(i));
  const faceUp = p.isHuman || p.show;
  const cls = ['seat', p.isHuman && 'human', active && 'active', (p.folded || p.out) && 'folded', win && 'win'].filter(Boolean).join(' ');
  const done = game.phase === 'handover';
  const note = p.out ? 'Out' : (done && p.handDesc && !p.folded) ? p.handDesc : p.lastAction;
  const ord = order == null ? 0 : order;
  const name = p.isHuman && me ? me.name : p.name;
  return (
    <div className={cls} style={{ left: pos.x + '%', top: pos.y + '%' }} title={p.style || ''}>
      <div className="hole">
        {!p.out && p.hole.map((c, k) => {
          const delay = MOTION ? (k * nDealt + ord) * DEAL_STEP : 0;
          return <Card key={'h' + game.handNum + '-' + k} c={faceUp ? c : null} up={faceUp} dx={dx} dy={dy}
            delay={delay} flipAfter={p.isHuman && MOTION ? delay + 480 : 0} mucked={p.folded && !p.isHuman} />;
        })}
      </div>
      <div className="plate">
        <Avatar av={p.isHuman ? me && me.avatar : p.pers && p.pers.av} name={name} size={30} />
        <div><div className="nm">{name}</div><div className="stack">{fmt(p.chips)}</div></div>
      </div>
      {note && <div className="act">{note}</div>}
    </div>
  );
}

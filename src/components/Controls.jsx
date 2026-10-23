import { describe, describeStart, evaluate } from '../engine/cards.js';
import { fmt } from '../util.js';

export default function Controls({ game, myTurn, limits, raiseTo, setRaiseTo, act, deal, showOdds, toggleOdds, odds }) {
  const me = game.players[0];
  const live = game.players.filter(p => !p.folded && !p.out);
  const handText = me.hole.length ? (game.board.length ? describe(evaluate(me.hole.concat(game.board))) : describeStart(me.hole)) : '';
  const clampTo = v => limits ? Math.max(limits.minTo, Math.min(limits.maxTo, Math.round(v || 0))) : v;
  const over = me.chips === 0 || game.players.filter(p => !p.out && p.chips > 0).length === 1;

  let body;
  if (game.phase === 'handover') {
    body = <div className="acts"><button className="btn raise" onClick={deal} autoFocus>{over ? 'See results' : 'Deal next hand'} <kbd>Enter</kbd></button></div>;
  } else if (myTurn && limits) {
    const presetTo = f => clampTo(game.currentBet + (limits.pot + limits.toCall) * f);
    const presets = [['Min', limits.minTo], ['½ pot', presetTo(.5)], ['¾ pot', presetTo(.75)], ['Pot', presetTo(1)], ['All-in', limits.maxTo]];
    const r = clampTo(raiseTo);
    const raiseLabel = r >= limits.maxTo ? `All-in ${fmt(limits.maxTo)}` : `${game.currentBet === 0 ? 'Bet' : 'Raise to'} ${fmt(r)}`;
    const callLabel = limits.toCall === 0 ? 'Check' : limits.toCall >= me.chips ? `Call all-in ${fmt(limits.toCall)}` : `Call ${fmt(limits.toCall)}`;
    body = (
      <>
        <div className="acts">
          <button className="btn" onClick={() => act('fold')}>Fold <kbd>F</kbd></button>
          <button className="btn call" onClick={() => act('call')} autoFocus>{callLabel} <kbd>C</kbd></button>
          {limits.canRaise && (
            <div className="raisebox">
              <input type="range" min={limits.minTo} max={limits.maxTo} step="1" value={r} onChange={e => setRaiseTo(+e.target.value)}
                aria-label="Raise amount" disabled={limits.minTo === limits.maxTo} />
              <input className="amt" type="number" inputMode="numeric" min={limits.minTo} max={limits.maxTo} value={raiseTo}
                onChange={e => setRaiseTo(e.target.value === '' ? '' : +e.target.value)} onBlur={() => setRaiseTo(r)} aria-label="Raise amount in chips" />
              <button className="btn raise" onClick={() => act('raise', r)}>{raiseLabel} <kbd>R</kbd></button>
            </div>
          )}
        </div>
        {limits.canRaise && limits.minTo < limits.maxTo && (
          <div className="presets">{presets.map(([l, v]) => <button key={l} className="btn small" onClick={() => setRaiseTo(v)}>{l}</button>)}</div>
        )}
      </>
    );
  } else {
    const who = game.toAct > 0 ? game.players[game.toAct].name : '';
    const msg = game.phase === 'runout' ? 'Dealing out the rest of the board' : who ? `${who} is deciding` : '';
    body = <div className="waiting">{me.folded && game.phase === 'betting' ? 'You folded. ' : ''}{msg}…</div>;
  }

  return (
    <section className="controls" aria-label="Your hand and actions">
      <div className="handline">
        <span className={'hand' + (me.folded ? ' dim' : '')}>{handText || 'Waiting for cards'}{me.folded ? ' (folded)' : ''}</span>
        <label className="toggle"><input type="checkbox" checked={showOdds} onChange={toggleOdds} /> Show win chance</label>
        {showOdds && odds != null && <span className="odds">{Math.round(odds * 100)}% against {live.length - 1} {live.length - 1 === 1 ? 'player' : 'players'}</span>}
      </div>
      {body}
    </section>
  );
}

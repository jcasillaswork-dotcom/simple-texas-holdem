import { fmt, ordinal } from '../util.js';

export default function GameOver({ game, onAgain, onSettings, stats }) {
  const won = game.place === 1;
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="over-title">
      <div className="modal">
        <h2 id="over-title">{won ? 'You won every chip on the table' : 'You’re out of chips'}</h2>
        <p>
          {won ? `It took ${game.handNum} hands.` : `You finished ${ordinal(game.place)} of ${game.players.length} after ${game.handNum} hands.`}
          {stats ? ` You’ve now won ${fmt(stats.wins)} of ${fmt(stats.games)} ${stats.games === 1 ? 'game' : 'games'}.` : ''}
        </p>
        <div className="row">
          <button className="btn" onClick={onSettings}>Change settings</button>
          <button className="btn raise" onClick={onAgain} autoFocus>Play again</button>
        </div>
      </div>
    </div>
  );
}

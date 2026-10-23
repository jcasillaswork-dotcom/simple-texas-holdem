import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Table from './components/Table.jsx';
import Controls from './components/Controls.jsx';
import Log from './components/Log.jsx';
import Setup from './components/Setup.jsx';
import GameOver from './components/GameOver.jsx';
import ProfilePanel from './components/ProfilePanel.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import Avatar from './components/Avatar.jsx';
import { newGame, startHand, applyAction, runoutStep, potTotal } from './engine/game.js';
import { botDecide } from './engine/bots.js';
import { equity } from './engine/cards.js';
import { blankStats } from './profile.js';
import { fmt, store, MOTION, DEAL_STEP } from './util.js';
import { storage } from './storage/index.js';
import { useAccounts, useNarrow } from './hooks/useAccounts.js';
import { onUpdate, applyUpdate } from './pwa.js';

const DEFAULT_SETTINGS = { bots: 4, stack: 1000, speed: 'normal' };

export default function App() {
  const { account, profile, ready, known, mode, updateProfile, register, login, logout } = useAccounts(storage);
  const [game, setGame] = useState(null);
  const [showSetup, setShowSetup] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showOdds, setShowOdds] = useState(() => store.get('holdem-odds', false));
  const [raiseTo, setRaiseTo] = useState(0);
  const [updateReady, setUpdateReady] = useState(false);
  const narrow = useNarrow();
  const paused = showSetup || showProfile || !profile;
  const settings = (profile && profile.prefs) || store.get('holdem-settings', DEFAULT_SETTINGS);

  useEffect(() => onUpdate(() => setUpdateReady(true)), []);

  const update = useCallback(fn => setGame(g => { if (!g) return g; const n = structuredClone(g); fn(n); return n; }), []);

  // Opponents act, and the board runs out when everyone is all-in
  useEffect(() => {
    if (!game || paused) return;
    const delay = { relaxed: 1150, normal: 700, fast: 300 }[game.settings.speed] || 700;
    if (game.phase === 'betting' && game.toAct > 0) {
      const who = game.toAct, hn = game.handNum;
      const fresh = game.players.every(p => !p.hasActed);
      const dealt = game.players.filter(p => p.hole.length).length;
      const wait = !MOTION || !fresh ? 0 : game.street === 'preflop' ? dealt * 2 * DEAL_STEP + 400 : 750;
      const t = setTimeout(() => update(n => {
        if (n.phase !== 'betting' || n.toAct !== who || n.handNum !== hn) return;
        const d = botDecide(n, who); applyAction(n, d.type, d.amount);
      }), delay + wait);
      return () => clearTimeout(t);
    }
    if (game.phase === 'runout') {
      const t = setTimeout(() => update(n => { if (n.phase === 'runout') runoutStep(n); }), Math.max(delay, MOTION ? 1100 : 850));
      return () => clearTimeout(t);
    }
  }, [game, paused, update]);

  const me = game ? game.players[0] : null;
  const myTurn = !!(game && game.phase === 'betting' && game.toAct === 0);
  const limits = useMemo(() => {
    if (!myTurn) return null;
    const g = game;
    const toCall = Math.min(g.currentBet - me.bet, me.chips);
    const maxTo = me.bet + me.chips;
    const minTo = Math.min(maxTo, g.currentBet === 0 ? g.bb : g.currentBet + g.minRaise);
    const canRaise = maxTo > g.currentBet && g.players.some((q, i) => i !== 0 && !q.folded && !q.out && !q.allIn);
    return { toCall, maxTo, minTo, canRaise, pot: potTotal(g) };
  }, [game, myTurn]);

  useEffect(() => { if (limits) setRaiseTo(limits.minTo); }, [myTurn, game && game.handNum, game && game.street, game && game.currentBet]);

  const liveCount = game ? game.players.filter(p => !p.folded && !p.out).length : 0;
  const odds = useMemo(() => {
    if (!game || !showOdds || !me || me.folded || me.out || !me.hole.length || liveCount < 2) return null;
    return equity(me.hole, game.board, liveCount - 1, 2500);
  }, [showOdds, game && game.handNum, game && game.board.length, liveCount, me && me.folded]);

  const act = useCallback((type, amount) => update(n => { if (n.phase !== 'betting' || n.toAct !== 0) return; applyAction(n, type, amount); }), [update]);
  const deal = useCallback(() => update(n => { if (n.phase === 'handover') startHand(n); }), [update]);
  const start = s => {
    store.set('holdem-settings', s);
    updateProfile(p => ({ ...p, prefs: s }));
    setGame(newGame(s, profile && profile.name)); setShowSetup(false);
  };
  const toggleOdds = () => { const v = !showOdds; setShowOdds(v); store.set('holdem-odds', v); };
  const doLogout = async () => { await logout(); setGame(null); setShowProfile(false); setShowSetup(true); };
  const closeProfile = useCallback(() => setShowProfile(false), []);
  const closeSetup = useCallback(() => setShowSetup(false), []);
  const saveProfile = (name, avatar) => {
    updateProfile(p => ({ ...p, name, avatar }));
    setGame(g => { if (!g) return g; const n = structuredClone(g); n.players[0].name = name; return n; });
    setShowProfile(false);
  };
  const resetStats = () => updateProfile(p => ({ ...p, stats: blankStats(), history: [] }));

  // Record results once per hand and once per finished game
  const counted = useRef(new Set());
  useEffect(() => {
    if (!game || !profile) return;
    const handKey = game.gid + '-' + game.handNum;
    if (game.phase === 'handover' && !counted.current.has(handKey)) {
      counted.current.add(handKey);
      const won = !!(game.result && game.result.winners.includes(0));
      const take = won ? game.players[0].won : 0;
      updateProfile(p => { const st = { ...blankStats(), ...p.stats };
        return { ...p, stats: { ...st, hands: st.hands + 1, handsWon: st.handsWon + (won ? 1 : 0), biggestPot: Math.max(st.biggestPot, take) } }; });
    }
    const overKey = game.gid + '-over';
    if (game.phase === 'gameover' && !counted.current.has(overKey)) {
      counted.current.add(overKey);
      updateProfile(p => {
        const st = { ...blankStats(), ...p.stats }, place = game.place;
        return { ...p,
          stats: { ...st, games: st.games + 1, wins: st.wins + (place === 1 ? 1 : 0), best: st.best == null ? place : Math.min(st.best, place) },
          history: [{ at: Date.now(), place, players: game.players.length, hands: game.handNum }, ...(p.history || [])].slice(0, 20) };
      });
    }
  }, [game && game.phase, game && game.handNum, game && game.gid, !!profile]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = e => {
      if (paused || !game || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target.tagName;
      if (tag === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
      if (tag === 'INPUT' && e.target.type === 'number' && e.key !== 'Enter') return;
      if (game.phase === 'handover' && e.key === 'Enter') { e.preventDefault(); deal(); return; }
      if (!myTurn || !limits) return;
      const k = e.key.toLowerCase();
      const r = Math.max(limits.minTo, Math.min(limits.maxTo, Math.round(+raiseTo || 0)));
      if (k === 'f') act('fold');
      else if (k === 'c' || k === 'k') act('call');
      else if ((k === 'r' || (k === 'enter' && tag === 'INPUT')) && limits.canRaise) act('raise', r);
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  });

  return (
    <div className="app">
      <header>
        <h1>Hold’em</h1>
        {game && game.handNum ? <span className="meta">Hand {game.handNum}, blinds {fmt(game.sb)}/{fmt(game.bb)}</span> : null}
        <span className="spacer" />
        {profile && (
          <button className="btn profile-btn" onClick={() => setShowProfile(true)} aria-label="Open your profile">
            <Avatar av={profile.avatar} name={profile.name} size={32} />{profile.name}
          </button>
        )}
        {game && profile && <button className="btn" onClick={() => setShowSetup(true)}>New game</button>}
      </header>
      <main>
        <Table game={game} narrow={narrow} me={profile} />
        {game && game.phase !== 'gameover' && (
          <Controls game={game} myTurn={myTurn} limits={limits} raiseTo={raiseTo} setRaiseTo={setRaiseTo}
            act={act} deal={deal} showOdds={showOdds} toggleOdds={toggleOdds} odds={odds} />
        )}
      </main>
      {game && <Log log={game.log} />}

      {!profile && (ready
        ? <AuthScreen known={known} mode={mode} onLogin={login} onRegister={register} />
        : <div className="overlay auth"><div className="modal"><p>Loading…</p></div></div>)}
      {profile && showProfile && (
        <ProfilePanel key={account.username} profile={profile} username={account.username} mode={mode}
          onSave={saveProfile} onClose={closeProfile} onReset={resetStats} onLogout={doLogout} />
      )}
      {profile && !showProfile && showSetup && (
        <Setup settings={settings} hasGame={!!game && game.phase !== 'gameover'} onStart={start} onClose={closeSetup} />
      )}
      {game && game.phase === 'gameover' && !showSetup && !showProfile && (
        <GameOver game={game} stats={profile && profile.stats} onAgain={() => start(settings)} onSettings={() => setShowSetup(true)} />
      )}
      {updateReady && (
        <div className="toast" role="status">
          <span>A new version is ready.</span>
          <button className="btn small raise" onClick={applyUpdate}>Reload</button>
          <button className="btn small" onClick={() => setUpdateReady(false)}>Later</button>
        </div>
      )}
    </div>
  );
}

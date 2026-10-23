import { freshDeck, evaluate, describe, withPhrase, cardText } from './cards.js';
import { BOTS } from './bots.js';
import { fmt } from '../util.js';

// Game engine. Every function mutates the game state object passed in;
// the UI clones state before calling these, so the engine stays plain and testable.
export const BLINDS = [[10,20],[15,30],[25,50],[50,100],[75,150],[100,200],[150,300],[200,400],[300,600],[500,1000],[750,1500],[1000,2000],[1500,3000],[2500,5000]];
export const HANDS_PER_LEVEL = 10;

export const says = (p, third, second) => p.isHuman ? `You ${second}` : `${p.name} ${third}`;
export function log(g, msg, kind){ g.logId++; g.log.push({id:g.logId, msg, kind}); if(g.log.length>120) g.log.splice(0, g.log.length-120); }
export const potTotal = g => g.players.reduce((s,p)=>s+p.totalBet, 0);
export function nextAlive(g, i){ const n=g.players.length; for(let k=1;k<=n;k++){ const j=(i+k)%n; if(!g.players[j].out) return j; } return i; }
export function canActCount(g){ return g.players.filter(p=>!p.folded && !p.out && !p.allIn).length; }
export function needsAction(g, p){
  if(p.folded || p.out || p.allIn) return false;
  return p.bet < g.currentBet || (!p.hasActed && canActCount(g) > 1);
}
export function nextToAct(g, from){ const n=g.players.length; for(let k=1;k<=n;k++){ const j=(from+k)%n; if(needsAction(g, g.players[j])) return j; } return -1; }
export function put(p, amt){ amt = Math.min(amt, p.chips); p.chips -= amt; p.bet += amt; p.totalBet += amt; if(p.chips===0) p.allIn = true; return amt; }

export function newGame(settings, myName){
  const players = [{name:myName || 'You', isHuman:true, chips:settings.stack}];
  BOTS.slice(0, settings.bots).forEach(b => players.push({name:b.name, style:b.style, pers:b, isHuman:false, chips:settings.stack}));
  players.forEach((p,i)=>Object.assign(p,{id:i, hole:[], folded:false, out:false, allIn:false, bet:0, totalBet:0, hasActed:false, lastAction:'', show:false, won:0, handDesc:'', place:null}));
  const g = {players, dealer:(Math.random()*players.length)|0, deck:[], board:[], street:'preflop', currentBet:0, minRaise:20,
    toAct:-1, phase:'betting', log:[], logId:0, sweep:null, payout:null, fx:0, gid:Date.now()+'-'+Math.random().toString(36).slice(2,7), handNum:0, sb:10, bb:20, result:null, place:null, settings};
  startHand(g);
  return g;
}

export function startHand(g){
  const P = g.players;
  const busting = P.filter(p=>!p.out && p.chips<=0);
  const aliveAfter = P.filter(p=>!p.out && p.chips>0).length;
  busting.forEach(p=>{ p.out = true; p.place = aliveAfter + 1; if(!p.isHuman) log(g, `${p.name} is out of chips`); });
  const alive = P.filter(p=>!p.out);
  if(P[0].out){ g.phase='gameover'; g.place=P[0].place; g.toAct=-1; return; }
  if(alive.length===1){ g.phase='gameover'; g.place=1; g.toAct=-1; return; }

  g.handNum++;
  const [sb,bb] = BLINDS[Math.min(BLINDS.length-1, Math.floor((g.handNum-1)/HANDS_PER_LEVEL))];
  const blindsUp = g.handNum>1 && bb!==g.bb;
  g.sb = sb; g.bb = bb;
  g.dealer = nextAlive(g, g.dealer);
  g.deck = freshDeck(); g.board = []; g.street = 'preflop'; g.result = null; g.sweep = null; g.payout = null;
  P.forEach(p=>Object.assign(p,{hole:[], folded:p.out, allIn:false, bet:0, totalBet:0, hasActed:false, lastAction:'', show:false, won:0, handDesc:''}));
  for(let k=0;k<2;k++) alive.forEach(p=>p.hole.push(g.deck.pop()));

  let sbPos, bbPos;
  if(alive.length===2){ sbPos=g.dealer; bbPos=nextAlive(g,g.dealer); }
  else { sbPos=nextAlive(g,g.dealer); bbPos=nextAlive(g,sbPos); }
  log(g, `Hand ${g.handNum}. ${P[g.dealer].isHuman ? 'You have' : P[g.dealer].name+' has'} the button.`, 'head');
  if(blindsUp) log(g, `Blinds are now ${fmt(sb)}/${fmt(bb)}`);
  const s = put(P[sbPos], sb); P[sbPos].lastAction = `Small blind ${fmt(s)}`;
  const b = put(P[bbPos], bb); P[bbPos].lastAction = `Big blind ${fmt(b)}`;
  g.currentBet = Math.max(...P.map(p=>p.bet));
  g.minRaise = bb;
  g.phase = 'betting';
  g.toAct = nextToAct(g, bbPos);
  if(g.toAct === -1) settleRound(g);
}

export function applyAction(g, type, amount){
  const p = g.players[g.toAct];
  const toCall = g.currentBet - p.bet;
  if(type==='fold'){
    p.folded = true; p.lastAction = 'Fold'; log(g, says(p,'folds','fold'));
  } else if(type==='call' || !(amount > g.currentBet)){
    const amt = put(p, Math.max(0, toCall));
    if(amt===0){ p.lastAction='Check'; log(g, says(p,'checks','check')); }
    else if(p.allIn){ p.lastAction=`All-in ${fmt(p.bet)}`; log(g, says(p,`calls ${fmt(amt)} and is all-in`,`call ${fmt(amt)} and are all-in`)); }
    else { p.lastAction=`Call ${fmt(amt)}`; log(g, says(p,`calls ${fmt(amt)}`,`call ${fmt(amt)}`)); }
  } else {
    const to = Math.min(amount, p.bet + p.chips);
    const inc = to - g.currentBet;
    const wasOpen = g.currentBet===0;
    if(inc >= g.minRaise){ g.minRaise = inc; g.players.forEach(q=>{ if(q!==p) q.hasActed=false; }); }
    g.currentBet = to;
    put(p, to - p.bet);
    if(p.allIn){ p.lastAction=`All-in ${fmt(to)}`; log(g, says(p,`goes all-in for ${fmt(to)}`,`go all-in for ${fmt(to)}`)); }
    else if(wasOpen){ p.lastAction=`Bet ${fmt(to)}`; log(g, says(p,`bets ${fmt(to)}`,`bet ${fmt(to)}`)); }
    else { p.lastAction=`Raise to ${fmt(to)}`; log(g, says(p,`raises to ${fmt(to)}`,`raise to ${fmt(to)}`)); }
  }
  p.hasActed = true;

  const live = g.players.filter(q=>!q.folded && !q.out);
  if(live.length===1){ winByFold(g, live[0]); return; }
  const nxt = nextToAct(g, g.toAct);
  if(nxt === -1) settleRound(g); else g.toAct = nxt;
}

export function collectBets(g){
  const items = g.players.filter(p=>p.bet>0).map(p=>({seat:p.id, amt:p.bet}));
  if(items.length) g.sweep = {id:++g.fx, items};
}
export function settleRound(g){
  const P = g.players;
  collectBets(g);
  P.forEach(p=>{ p.bet=0; p.hasActed=false; p.lastAction = p.folded&&!p.out ? 'Fold' : p.allIn ? 'All-in' : ''; });
  g.currentBet = 0; g.minRaise = g.bb;
  if(g.street==='river'){ showdown(g); return; }
  if(canActCount(g) <= 1){
    g.phase='runout'; g.toAct=-1;
    P.forEach(p=>{ if(!p.folded && !p.out) p.show = true; });
    return;
  }
  dealStreet(g);
  g.toAct = nextToAct(g, g.dealer);
}

export function dealStreet(g){
  g.deck.pop();
  let name;
  if(g.street==='preflop'){ g.board.push(g.deck.pop(), g.deck.pop(), g.deck.pop()); g.street='flop'; name='Flop'; }
  else if(g.street==='flop'){ g.board.push(g.deck.pop()); g.street='turn'; name='Turn'; }
  else { g.board.push(g.deck.pop()); g.street='river'; name='River'; }
  log(g, `${name}: ${g.board.map(cardText).join(' ')}`);
}

export function runoutStep(g){
  if(g.street==='river') showdown(g); else dealStreet(g);
}

export function winByFold(g, w){
  const pot = potTotal(g);
  w.chips += pot; w.won = pot;
  collectBets(g);
  g.players.forEach(p=>{ p.bet=0; });
  g.payout = {id:++g.fx, items:[{seat:w.id, amt:pot}]};
  const line = says(w, `wins ${fmt(pot)}`, `win ${fmt(pot)}`) + ' when everyone else folds';
  g.result = {lines:[line], winners:[w.id]};
  log(g, line, 'win');
  g.phase='handover'; g.toAct=-1;
}

export function showdown(g){
  const P = g.players;
  while(g.board.length<5) g.board.push(g.deck.pop());
  const live = P.filter(p=>!p.folded && !p.out);
  live.forEach(p=>{ p.score = evaluate(p.hole.concat(g.board)); p.handDesc = describe(p.score); p.show = true; });

  const levels = [...new Set(live.map(p=>p.totalBet))].sort((a,b)=>a-b);
  const pots = []; let prev = 0;
  for(const lv of levels){
    let amt = 0; P.forEach(p=>{ amt += Math.max(0, Math.min(p.totalBet, lv) - prev); });
    if(amt>0) pots.push({amt, elig: live.filter(p=>p.totalBet>=lv)});
    prev = lv;
  }
  const counted = pots.reduce((s,x)=>s+x.amt,0), total = potTotal(g);
  if(pots.length && total>counted) pots[pots.length-1].amt += total-counted;

  const order = []; for(let k=1;k<=P.length;k++) order.push(P[(g.dealer+k)%P.length]);
  const contested = pots.filter(x=>x.elig.length>1);
  const lines = [], winners = new Set(); let idx = 0;
  pots.forEach(pt=>{
    const best = Math.max(...pt.elig.map(p=>p.score));
    const ws = order.filter(p=>pt.elig.includes(p) && p.score===best);
    const share = Math.floor(pt.amt/ws.length); let rem = pt.amt - share*ws.length;
    ws.forEach(w=>{ const a = share + (rem>0?1:0); if(rem>0) rem--; w.chips += a; w.won += a; });
    if(pt.elig.length===1){ if(pt.elig[0].isHuman || pt.amt>0) log(g, says(pt.elig[0], `gets back ${fmt(pt.amt)} uncalled`, `get back ${fmt(pt.amt)} uncalled`)); return; }
    ws.forEach(w=>winners.add(w.id));
    const label = contested.length>1 ? (idx===0 ? 'Main pot' : contested.length>2 ? `Side pot ${idx}` : 'Side pot') : '';
    idx++;
    let line;
    if(ws.length===1) line = says(ws[0], `wins ${fmt(pt.amt)}`, `win ${fmt(pt.amt)}`) + ` with ${withPhrase(best)}`;
    else line = `${ws.map(w=>w.name).join(' and ')} split ${fmt(pt.amt)} with ${withPhrase(best)}`;
    if(label) line = `${label}: ${line}`;
    lines.push(line); log(g, line, 'win');
  });
  g.result = {lines, winners:[...winners]};
  g.payout = {id:++g.fx, items:P.filter(p=>p.won>0).map(p=>({seat:p.id, amt:p.won}))};
  g.phase='handover'; g.toAct=-1;
}



// Computer opponents: personalities and decision-making.
import { equity } from './cards.js';

const potTotal = g => g.players.reduce((s,p)=>s+p.totalBet, 0);

/* ---------- Opponents ---------- */
export const BOTS = [
  {name:'Rosa',  style:'Tight and aggressive', tight:0.15,  aggr:0.7,  bluff:0.07, av:{color:'#B3202A', emblem:'initial'}},
  {name:'Mateo', style:'Calls a lot',          tight:-0.1,  aggr:0.2,  bluff:0.03, av:{color:'#3A6EA5', emblem:'initial'}},
  {name:'Lupe',  style:'Wild and aggressive',  tight:-0.15, aggr:0.95, bluff:0.18, av:{color:'#C2571A', emblem:'initial'}},
  {name:'Hugo',  style:'Very tight',           tight:0.25,  aggr:0.35, bluff:0.01, av:{color:'#2B2B30', emblem:'initial'}},
  {name:'Iris',  style:'Balanced',             tight:0.05,  aggr:0.5,  bluff:0.08, av:{color:'#7B4BB0', emblem:'initial'}},
];


export function botDecide(g, i){
  const p = g.players[i], pers = p.pers;
  const live = g.players.filter(q=>!q.folded && !q.out);
  const nOpp = live.length - 1;
  const toCall = Math.min(g.currentBet - p.bet, p.chips);
  const pot = potTotal(g);
  let eq = equity(p.hole, g.board, nOpp, g.board.length ? 300 : 400);
  if(toCall>0 && g.board.length) eq *= 1 - 0.25*Math.min(1, toCall/Math.max(pot,1)); // respect big bets
  const rel = eq*(nOpp+1);
  const maxTo = p.bet + p.chips;
  const others = g.players.some((q,j)=>j!==i && !q.folded && !q.out && !q.allIn);
  const canRaise = maxTo > g.currentBet && others;
  const raiseBar = 1.55 - pers.aggr*0.45 + pers.tight*1.5;
  const wantsValue = toCall===0 ? rel > raiseBar : rel > raiseBar + 0.45;
  const bluff = toCall===0 && Math.random() < pers.bluff;

  if(canRaise && ((wantsValue && Math.random() < 0.4 + pers.aggr*0.55) || bluff)){
    const size = (pot + toCall) * (0.45 + Math.random()*0.5 + (rel>2.4 ? 0.25 : 0));
    let to = g.currentBet + Math.max(g.minRaise, size);
    to = Math.round(to/g.sb)*g.sb;
    const minTo = g.currentBet===0 ? g.bb : g.currentBet + g.minRaise;
    if(to < minTo) to = minTo;
    if(to > maxTo*0.8) to = maxTo;
    return {type:'raise', amount:Math.min(to, maxTo)};
  }
  if(toCall===0) return {type:'call'};
  const potOdds = toCall/(pot + toCall);
  const need = potOdds*(1 + pers.tight) + (toCall>=p.chips ? 0.06 : 0);
  if(eq >= need) return {type:'call'};
  if(Math.random() < pers.bluff*0.4 && toCall <= g.bb*2) return {type:'call'};
  return {type:'fold'};
}

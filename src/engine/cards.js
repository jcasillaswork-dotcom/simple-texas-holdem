// Cards, hand evaluation and win-chance simulation. No UI or browser dependencies.

/* ---------- Cards ---------- */
export const RN = {2:'Two',3:'Three',4:'Four',5:'Five',6:'Six',7:'Seven',8:'Eight',9:'Nine',10:'Ten',11:'Jack',12:'Queen',13:'King',14:'Ace'};
export const plural = r => r === 6 ? 'Sixes' : RN[r] + 's';
export const rl = r => ({11:'J',12:'Q',13:'K',14:'A'})[r] || String(r);
export const SUIT = ['♠\uFE0E','♥\uFE0E','♦\uFE0E','♣\uFE0E'];
export const SUIT_NAME = ['spades','hearts','diamonds','clubs'];
export const isRed = s => s === 1 || s === 2;
export const cardText = c => rl(c.r) + SUIT[c.s];

export function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
export function freshDeck(){ const d=[]; for(let r=2;r<=14;r++) for(let s=0;s<4;s++) d.push({r,s}); return shuffle(d); }

/* ---------- Hand evaluation ---------- */
export function score(cat, ks){ let v=cat; for(let i=0;i<5;i++) v = v*15 + (ks[i]||0); return v; }
export function straightHigh(ranks){
  const has = new Array(15).fill(false);
  for(const r of ranks) has[r] = true;
  if(has[14]) has[1] = true;
  for(let h=14; h>=5; h--){ let ok=true; for(let k=0;k<5;k++) if(!has[h-k]){ ok=false; break; } if(ok) return h; }
  return 0;
}
export function evaluate(cards){
  const cnt = new Array(15).fill(0), bySuit = [[],[],[],[]];
  for(const c of cards){ cnt[c.r]++; bySuit[c.s].push(c.r); }
  let fs = -1; for(let s=0;s<4;s++) if(bySuit[s].length>=5) fs = s;
  if(fs>=0){ const sh = straightHigh(bySuit[fs]); if(sh) return score(8,[sh]); }
  const groups = []; for(let r=14;r>=2;r--) if(cnt[r]) groups.push([cnt[r], r]);
  groups.sort((a,b)=> b[0]-a[0] || b[1]-a[1]);
  if(groups[0][0]===4){ const k = groups.slice(1).map(g=>g[1]).sort((a,b)=>b-a)[0]; return score(7,[groups[0][1],k]); }
  if(groups[0][0]===3 && groups[1] && groups[1][0]>=2) return score(6,[groups[0][1],groups[1][1]]);
  if(fs>=0) return score(5, bySuit[fs].slice().sort((a,b)=>b-a).slice(0,5));
  const sh = straightHigh(cards.map(c=>c.r)); if(sh) return score(4,[sh]);
  if(groups[0][0]===3) return score(3,[groups[0][1], ...groups.slice(1).map(g=>g[1]).slice(0,2)]);
  if(groups[0][0]===2 && groups[1] && groups[1][0]===2){
    const rest = groups.slice(2).map(g=>g[1]);
    return score(2,[groups[0][1], groups[1][1], rest.length ? Math.max(...rest) : 0]);
  }
  if(groups[0][0]===2) return score(1,[groups[0][1], ...groups.slice(1).map(g=>g[1]).slice(0,3)]);
  return score(0, groups.map(g=>g[1]).slice(0,5));
}
export function parts(v){ const k=[]; let x=v; for(let i=0;i<5;i++){ k.unshift(x%15); x=Math.floor(x/15); } return {cat:x, k}; }
export function describe(v){
  const {cat,k} = parts(v);
  switch(cat){
    case 8: return k[0]===14 ? 'Royal flush' : `Straight flush, ${RN[k[0]]}-high`;
    case 7: return `Four ${plural(k[0])}`;
    case 6: return `Full house, ${plural(k[0])} over ${plural(k[1])}`;
    case 5: return `Flush, ${RN[k[0]]}-high`;
    case 4: return `Straight, ${RN[k[0]]}-high`;
    case 3: return `Three ${plural(k[0])}`;
    case 2: return `Two pair, ${plural(k[0])} and ${plural(k[1])}`;
    case 1: return `Pair of ${plural(k[0])}`;
    default: return `${RN[k[0]]}-high`;
  }
}
export function withPhrase(v){
  const {cat,k} = parts(v);
  switch(cat){
    case 8: return k[0]===14 ? 'a royal flush' : `a straight flush, ${RN[k[0]]}-high`;
    case 7: return `four ${plural(k[0])}`;
    case 6: return `a full house, ${plural(k[0])} over ${plural(k[1])}`;
    case 5: return `a flush, ${RN[k[0]]}-high`;
    case 4: return `a straight, ${RN[k[0]]}-high`;
    case 3: return `three ${plural(k[0])}`;
    case 2: return `two pair, ${plural(k[0])} and ${plural(k[1])}`;
    case 1: return `a pair of ${plural(k[0])}`;
    default: return `${RN[k[0]]}-high`;
  }
}
export function describeStart(hole){
  const [a,b] = hole[0].r >= hole[1].r ? hole : [hole[1],hole[0]];
  if(a.r===b.r) return `Pocket ${plural(a.r)}`;
  return `${RN[a.r]}-${RN[b.r]} ${a.s===b.s ? 'suited' : 'offsuit'}`;
}

/* Monte Carlo win chance against nOpp random hands */
export function equity(hole, board, nOpp, iters){
  if(nOpp < 1) return 1;
  const used = new Set(hole.concat(board).map(c=>c.r*4+c.s));
  const rest = [];
  for(let r=2;r<=14;r++) for(let s=0;s<4;s++) if(!used.has(r*4+s)) rest.push({r,s});
  const needB = 5 - board.length, need = needB + 2*nOpp;
  let total = 0;
  for(let it=0; it<iters; it++){
    for(let i=0;i<need;i++){ const j = i + ((Math.random()*(rest.length-i))|0); const t=rest[i]; rest[i]=rest[j]; rest[j]=t; }
    const b = board.concat(rest.slice(0,needB));
    const mine = evaluate(hole.concat(b));
    let ties = 0, beaten = false;
    for(let o=0;o<nOpp;o++){
      const v = evaluate([rest[needB+2*o], rest[needB+2*o+1]].concat(b));
      if(v > mine){ beaten = true; break; }
      if(v === mine) ties++;
    }
    if(!beaten) total += 1/(ties+1);
  }
  return total/iters;
}


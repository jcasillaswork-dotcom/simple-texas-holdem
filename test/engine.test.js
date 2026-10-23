import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, describe } from '../src/engine/cards.js';
import { newGame, startHand, applyAction, runoutStep, potTotal } from '../src/engine/game.js';
import { BOTS, botDecide } from '../src/engine/bots.js';

const C = s => s.split(' ').map(t => ({ r: '23456789TJQKA'.indexOf(t[0]) + 2, s: 'shdc'.indexOf(t[1]) }));

test('hand names', () => {
  assert.equal(describe(evaluate(C('As Ks Qs Js Ts 2d 3c'))), 'Royal flush');
  assert.equal(describe(evaluate(C('Ah 2d 3c 4s 5h Kd Kc'))), 'Straight, Five-high');
  assert.equal(describe(evaluate(C('Kh Kd Kc 4s 4h 4d 2c'))), 'Full house, Kings over Fours');
  assert.equal(describe(evaluate(C('2h 2d 5c 5s 9h 9d Ac'))), 'Two pair, Nines and Fives');
});

test('hand ranking order', () => {
  assert.ok(evaluate(C('Ah Kh Qh Jh 9h 2c 3d')) > evaluate(C('As Kd Qc Jh Th 2c 3d')), 'flush beats straight');
  assert.ok(evaluate(C('Ah Ad Kc Kh 2s 3c 4d')) > evaluate(C('Ah Ad Qc Qh Ks 3c 4d')), 'kings up beats queens up');
});

test('hundreds of bot-only hands keep chips and pots consistent', () => {
  let hands = 0;
  for (let game = 0; game < 30; game++) {
    const g = newGame({ bots: 5, stack: 1000, speed: 'fast' }, 'Test');
    g.players[0].isHuman = false; g.players[0].pers = BOTS[4];
    let guard = 0;
    while (g.phase !== 'gameover' && guard++ < 20000) {
      if (g.phase === 'betting') {
        const p = g.players[g.toAct];
        assert.ok(p && !p.folded && !p.allIn, 'player to act must be able to act');
        const d = botDecide(g, g.toAct); applyAction(g, d.type, d.amount);
      } else if (g.phase === 'runout') runoutStep(g);
      else {
        hands++;
        assert.equal(g.players.reduce((a, p) => a + p.chips, 0), 6000, 'chips are conserved');
        assert.equal(g.payout.items.reduce((a, x) => a + x.amt, 0), potTotal(g), 'payouts equal the pot');
        assert.ok(g.players.every(p => p.chips >= 0));
        startHand(g);
      }
    }
    assert.ok(guard < 20000, 'game finishes');
  }
  assert.ok(hands > 300);
});

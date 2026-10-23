export const AV_COLORS = ['#155056', '#B3202A', '#C9A24A', '#2E8A57', '#7B4BB0', '#2B2B30', '#C2571A', '#3A6EA5'];
export const AV_LIGHT = { '#C9A24A': true };
export const EMBLEMS = ['initial', '♠\uFE0E', '♥\uFE0E', '♦\uFE0E', '♣\uFE0E', '★\uFE0E', '♛\uFE0E', '♞\uFE0E'];
export const USERNAME_RE = /^[A-Za-z0-9_-]{3,20}$/;
export const blankStats = () => ({ games: 0, wins: 0, best: null, hands: 0, handsWon: 0, biggestPot: 0 });
export const cleanName = n => (n || '').replace(/\s+/g, ' ').trim().slice(0, 18);
export const newProfile = (name, avatar) => ({ v: 1, name, avatar, stats: blankStats(), history: [], prefs: null, created: Date.now() });

import { AV_COLORS, AV_LIGHT } from '../profile.js';

export default function Avatar({ av, name, size = 30 }) {
  const a = av || { color: AV_COLORS[0], emblem: 'initial' };
  const glyph = a.emblem === 'initial' ? ((name || '?').trim().charAt(0).toUpperCase() || '?') : a.emblem;
  return (
    <span className="av" aria-hidden="true" style={{
      width: size, height: size, fontSize: Math.round(size * .52),
      background: a.color, color: AV_LIGHT[a.color] ? '#2A1F07' : '#FBF8F1',
    }}>{glyph}</span>
  );
}

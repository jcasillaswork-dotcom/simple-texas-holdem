import { AV_COLORS, EMBLEMS } from '../profile.js';

export default function AvatarPicker({ av, setAv, initial }) {
  return (
    <>
      <fieldset><legend>Color</legend>
        <div className="swatches">{AV_COLORS.map(c => (
          <button type="button" key={c} aria-label={'Color ' + c} aria-pressed={av.color === c} style={{ background: c }} onClick={() => setAv({ ...av, color: c })} />
        ))}</div>
      </fieldset>
      <fieldset><legend>Symbol</legend>
        <div className="seg glyphs">{EMBLEMS.map(g => (
          <button type="button" key={g} aria-pressed={av.emblem === g} aria-label={g === 'initial' ? 'First letter of your name' : 'Symbol ' + g}
            onClick={() => setAv({ ...av, emblem: g })}>{g === 'initial' ? (initial || 'A').charAt(0).toUpperCase() : g}</button>
        ))}</div>
      </fieldset>
    </>
  );
}

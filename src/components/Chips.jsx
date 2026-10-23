const DENOMS = [[1000, '#D9AE3A', '#7E5F10'], [500, '#7B4BB0', '#3F2268'], [100, '#2B2B30', '#0A0A0C'], [25, '#2E8A57', '#16502F'], [5, '#B3202A', '#661017'], [1, '#E9E3D4', '#9C9384']];

// A chip stack that shows an amount in casino denominations.
export default function Chips({ amt, size }) {
  const cols = []; let a = Math.round(amt);
  for (const [v, c, d] of DENOMS) { const k = Math.floor(a / v); if (k) { cols.push({ v, c, d, k: Math.min(k, 12) }); a -= k * v; } }
  return (
    <div className="chips" style={size ? { '--cs': size + 'px' } : undefined} aria-hidden="true">
      {cols.slice(0, 4).map(col => (
        <div key={col.v} className="col" style={{ height: `calc(var(--cs) * .58 + ${(col.k - 1) * 3}px)` }}>
          {Array.from({ length: col.k }, (_, j) => <i key={j} className="chp" style={{ bottom: j * 3 + 'px', '--c': col.c, '--d': col.d }} />)}
        </div>
      ))}
    </div>
  );
}

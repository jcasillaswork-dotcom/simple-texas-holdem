export default function Log({ log }) {
  return (
    <aside className="log" aria-label="Hand history">
      <h2>Hand history</h2>
      <ol>{log.slice().reverse().map(e => <li key={e.id} className={e.kind || ''}>{e.msg}</li>)}</ol>
    </aside>
  );
}

// cypod-telemetry
export function Sparkline({ values }) {
  if (values.length < 2) return <div className="sparkline-empty">—</div>;
  const min = Math.min(...values); const max = Math.max(...values); const range = Math.max(max - min, 1);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${36 - ((value - min) / range) * 28}`).join(' ');
  return <div className="sparkline-wrap"><svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} fill="none" vectorEffect="non-scaling-stroke" /></svg></div>;
}

export default function Trend({ delta }: { delta: number | null | undefined }) {
  if (delta == null) return null;
  const up = delta > 0.05, down = delta < -0.05;
  return (
    <span className={`text-xs font-medium ${up ? "text-emerald-600" : down ? "text-rose-600" : "text-slate-400"}`}>
      {up ? "▲" : down ? "▼" : "▬"} {Math.abs(delta).toFixed(1)}
    </span>
  );
}

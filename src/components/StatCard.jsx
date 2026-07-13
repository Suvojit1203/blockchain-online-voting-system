export default function StatCard({ label, value, detail }) {
  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <strong className="mt-2 block text-2xl text-ink">{value}</strong>
      {detail ? <span className="mt-1 block text-xs text-slate-500">{detail}</span> : null}
    </article>
  );
}

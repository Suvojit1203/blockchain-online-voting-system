export default function AnalyticsCharts({ dashboard }) {
  const pendingVotes = Math.max(dashboard.voterCount - dashboard.totalVotes, 0);
  const totalForPie = Math.max(dashboard.voterCount, 1);
  const castPercent = Math.min(Math.round((dashboard.totalVotes / totalForPie) * 100), 100);
  const pendingPercent = 100 - castPercent;
  const maxVotes = Math.max(...dashboard.candidates.map((candidate) => candidate.voteCount), 1);

  return (
    <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <article className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-bold">Voter Turnout Pie Chart</h2>
        <div className="mt-5 grid place-items-center">
          <div
            className="grid h-44 w-44 place-items-center rounded-full"
            style={{
              background: `conic-gradient(#0f766e 0 ${castPercent}%, #d97706 ${castPercent}% 100%)`
            }}
          >
            <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center shadow-inner">
              <strong className="text-2xl">{castPercent}%</strong>
              <span className="text-xs text-slate-500">cast</span>
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-2 text-sm">
          <span className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <i className="h-3 w-3 rounded-full bg-brand" />
              Votes cast
            </span>
            <strong>{dashboard.totalVotes}</strong>
          </span>
          <span className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <i className="h-3 w-3 rounded-full bg-amber-600" />
              Pending voters
            </span>
            <strong>{pendingVotes}</strong>
          </span>
          <span className="text-xs text-slate-500">Pending share: {pendingPercent}%</span>
        </div>
      </article>

      <article className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-bold">Candidate Vote Bar Graph</h2>
        <div className="mt-5 grid gap-4">
          {dashboard.candidates.length ? (
            dashboard.candidates.map((candidate) => {
              const width = Math.max(Math.round((candidate.voteCount / maxVotes) * 100), 4);

              return (
                <div className="grid gap-2" key={candidate.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <strong>{candidate.name}</strong>
                    <span>{candidate.voteCount} votes</span>
                  </div>
                  <div className="h-8 rounded-md bg-slate-100">
                    <div
                      className="grid h-8 place-items-end rounded-md bg-brand pr-2 text-xs font-bold text-white"
                      style={{ width: `${width}%` }}
                    >
                      {candidate.voteCount}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">No candidates available yet.</p>
          )}
        </div>
      </article>
    </section>
  );
}

import { LockKeyhole, Radio, Trophy } from "lucide-react";
import { CONTRACT_CONFIG } from "../config/contractConfig";
import AnalyticsCharts from "./AnalyticsCharts";
import CandidateSymbol from "./CandidateSymbol";
import StatCard from "./StatCard";

function formatDateTime(value) {
  if (!value) return "Not declared";
  return new Date(value).toLocaleString();
}

function getSortedCandidates(candidates) {
  return [...candidates].sort((first, second) => second.voteCount - first.voteCount);
}

export default function ResultsPanel({ authSession, dashboard, resultDeclaration }) {
  const isAdmin = authSession?.role === "admin";

  if (!isAdmin && !resultDeclaration.declared) {
    return (
      <section className="rounded-lg border border-line bg-white p-8 text-center shadow-soft">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-600">
          <LockKeyhole size={28} />
        </div>
        <h2 className="mt-4 text-2xl font-bold">Results Not Declared</h2>
        <p className="mx-auto mt-2 max-w-xl text-slate-600">
          Vote counts are sealed for voters until the election officer stops the election and declares
          the official result.
        </p>
      </section>
    );
  }

  if (isAdmin) {
    return (
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Administrative Result Dashboard</h2>
            <p className="text-sm text-slate-500">
              These statistics are visible only to the administrator.
            </p>
          </div>
          <a
            className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            href={`${CONTRACT_CONFIG.blockExplorer}/address/${CONTRACT_CONFIG.address}`}
            rel="noreferrer"
            target="_blank"
          >
            View Contract
          </a>
        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-3">
          <StatCard label="Total Votes" value={dashboard.totalVotes} />
          <StatCard label="Registered Voters" value={dashboard.voterCount} />
          <StatCard label="Candidates" value={dashboard.candidateCount} />
        </div>

        <AnalyticsCharts dashboard={dashboard} />
      </section>
    );
  }

  const sortedCandidates = getSortedCandidates(dashboard.candidates);
  const winner = sortedCandidates[0];
  const runnerUp = sortedCandidates[1];
  const winningMargin = runnerUp ? winner.voteCount - runnerUp.voteCount : winner?.voteCount || 0;

  return (
    <section className="grid gap-5">
      <article className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-red-700 px-5 py-3 text-white">
          <div className="inline-flex items-center gap-2 font-bold uppercase">
            <Radio size={18} />
            Election Result Declared
          </div>
          <span className="text-sm">Declared: {formatDateTime(resultDeclaration.declaredAt)}</span>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-5">
            <div className="flex items-center gap-3 text-yellow-900">
              {winner ? <CandidateSymbol candidate={winner} size="lg" /> : <Trophy size={32} />}
              <div>
                <p className="text-sm font-bold uppercase">Winner</p>
                <h2 className="text-3xl font-bold">{winner?.name || "No winner"}</h2>
                {winner ? <p className="text-sm font-semibold">{winner.party || winner.details}</p> : null}
              </div>
            </div>
            <p className="mt-4 text-lg">
              {winner?.name} wins with <strong>{winner?.voteCount || 0}</strong> votes.
            </p>
            <p className="mt-2 text-sm text-yellow-900">
              {runnerUp
                ? `Winning margin: ${winningMargin} vote${winningMargin === 1 ? "" : "s"} over ${runnerUp.name}.`
                : "No runner-up available."}
            </p>
          </div>

          <div className="grid gap-3">
            {sortedCandidates.map((candidate, index) => {
              const behind = winner.voteCount - candidate.voteCount;

              return (
                <article
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4"
                  key={candidate.id}
                >
                  <div className="flex items-center gap-3">
                    <CandidateSymbol candidate={candidate} />
                    <div>
                    <p className="text-sm font-bold uppercase text-slate-500">
                      Rank #{index + 1}
                    </p>
                    <h3 className="text-xl font-bold">{candidate.name}</h3>
                    <p className="text-sm text-slate-500">{candidate.party || candidate.details}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <strong className="block text-2xl">{candidate.voteCount}</strong>
                    <span className="text-sm text-slate-500">
                      {index === 0
                        ? "Winner"
                        : `Behind by ${behind} vote${behind === 1 ? "" : "s"}`}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </article>
    </section>
  );
}

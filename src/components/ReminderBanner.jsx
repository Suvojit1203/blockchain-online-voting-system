import { useEffect, useMemo, useState } from "react";
import { BellRing, Clock3 } from "lucide-react";
import { formatCountdown } from "../utils/contractHelpers";

export default function ReminderBanner({ dashboard, authSession }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const remainingVotes = Math.max(dashboard.voterCount - dashboard.totalVotes, 0);
  const secondsLeft = dashboard.endTime ? Math.max(dashboard.endTime - now, 0) : 0;
  const timerLabel = useMemo(() => {
    if (dashboard.paused) return "Election paused";
    if (!dashboard.active) return "Election stopped";
    if (!dashboard.endTime) return "Real-time status enabled";
    if (secondsLeft <= 0) return "Polling time ended";
    return `Election Ends In: ${formatCountdown(secondsLeft)}`;
  }, [dashboard.active, dashboard.endTime, dashboard.paused, secondsLeft]);

  const message =
    authSession?.role === "admin"
      ? `${remainingVotes} registered voters have not cast votes yet. Send reminder notices before closing.`
      : dashboard.voted
        ? "Your vote is recorded. Final result will appear only after official declaration."
        : "Reminder: cast your vote before the election officer closes the election.";

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BellRing size={22} />
          <div>
            <strong>Voting Reminder</strong>
            <p className="text-sm">{message}</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md bg-white/80 px-3 py-2 text-sm font-semibold">
          <Clock3 size={16} />
          {timerLabel}
        </div>
      </div>
    </section>
  );
}

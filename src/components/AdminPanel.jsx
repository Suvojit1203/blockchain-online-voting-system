import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Megaphone,
  Pause,
  Play,
  Plus,
  ShieldCheck,
  Square,
  TimerReset,
  UserCheck,
  UserPlus
} from "lucide-react";
import {
  addCandidate,
  approveVoterRequest,
  configureElection,
  declareResultOnChain,
  formatTimestamp,
  getVoterRegistrationRequests,
  pauseElection,
  registerVoter,
  rejectVoterRequest,
  shortenAddress,
  shortenHash,
  startElection,
  stopElection,
  unpauseElection
} from "../utils/contractHelpers";
import {
  declareElectionResult,
  resetElectionResultDeclaration
} from "../utils/localRegistry";
import AnalyticsCharts from "./AnalyticsCharts";
import AuditLog from "./AuditLog";
import StatCard from "./StatCard";

export default function AdminPanel({
  account,
  dashboard,
  resultDeclaration,
  onRefresh,
  onResultDeclarationChange,
  onStatus
}) {
  const [candidateForm, setCandidateForm] = useState({
    name: "",
    partyName: "",
    symbolURI: "",
    manifestoURI: "",
    profileURI: ""
  });
  const [settingsForm, setSettingsForm] = useState({
    electionId: "2026",
    electionName: dashboard.name || "E-Election of India 2026",
    startTime: "",
    endTime: ""
  });
  const [voterAddress, setVoterAddress] = useState("");
  const [voterIdentityHash, setVoterIdentityHash] = useState("");
  const [registrationRequests, setRegistrationRequests] = useState([]);
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const adminWalletVerified = Boolean(account) && dashboard.isAdmin;

  useEffect(() => {
    setSettingsForm((form) => ({
      ...form,
      electionId: String(dashboard.electionId || form.electionId || 2026),
      electionName: dashboard.name || form.electionName
    }));
  }, [dashboard.electionId, dashboard.name]);

  useEffect(() => {
    loadAdminExtras();
  }, [
    account,
    dashboard.active,
    dashboard.candidateCount,
    dashboard.totalVotes,
    dashboard.voterCount
  ]);

  async function loadAdminExtras() {
    setExtrasLoading(true);

    try {
      const requests = await getVoterRegistrationRequests();
      setRegistrationRequests(requests);
    } catch {
      setRegistrationRequests([]);
    } finally {
      setExtrasLoading(false);
    }
  }

  async function runTransaction(actionName, action) {
    setBusyAction(actionName);
    onStatus("Waiting for wallet confirmation...", "info");

    try {
      await action();
      onStatus("Transaction confirmed on blockchain.", "success");
      await onRefresh();
      await loadAdminExtras();
    } catch (error) {
      onStatus(error.reason || error.shortMessage || error.message, "error");
    } finally {
      setBusyAction("");
    }
  }

  function handleCandidateSubmit(event) {
    event.preventDefault();

    runTransaction("candidate", async () => {
      await addCandidate({
        name: candidateForm.name.trim(),
        partyName: candidateForm.partyName.trim(),
        symbolURI: candidateForm.symbolURI.trim(),
        manifestoURI: candidateForm.manifestoURI.trim(),
        profileURI: candidateForm.profileURI.trim()
      });
      setCandidateForm({
        name: "",
        partyName: "",
        symbolURI: "",
        manifestoURI: "",
        profileURI: ""
      });
    });
  }

  function handleVoterSubmit(event) {
    event.preventDefault();

    runTransaction("voter", async () => {
      await registerVoter(voterAddress.trim(), voterIdentityHash.trim());
      setVoterAddress("");
      setVoterIdentityHash("");
    });
  }

  function handleSettingsSubmit(event) {
    event.preventDefault();

    runTransaction("settings", async () => {
      await configureElection({
        electionId: settingsForm.electionId,
        electionName: settingsForm.electionName.trim(),
        startTime: settingsForm.startTime,
        endTime: settingsForm.endTime
      });
    });
  }

  async function handleStartElection() {
    await runTransaction("start", async () => {
      await startElection();
      resetElectionResultDeclaration();
      onResultDeclarationChange();
    });
  }

  async function handleDeclareResult() {
    if (dashboard.active) {
      onStatus("Stop the election before declaring final result.", "error");
      return;
    }

    setBusyAction("declare");
    onStatus("Publishing official result declaration...", "info");

    try {
      if (!dashboard.resultDeclared) {
        await declareResultOnChain();
      }
      declareElectionResult();
      onResultDeclarationChange();
      await onRefresh();
      await loadAdminExtras();
      onStatus("Election result declared. Voters can now view the final result.", "success");
    } catch (error) {
      const message = error.reason || error.shortMessage || error.message || "";
      const optionalMethodMissing =
        message.includes("missing revert data") ||
        message.includes("could not decode") ||
        message.includes("function selector");

      if (optionalMethodMissing) {
        declareElectionResult();
        onResultDeclarationChange();
        onStatus("Result declared in portal. Redeploy the upgraded contract for on-chain declaration event.", "success");
      } else {
        onStatus(message, "error");
      }
    } finally {
      setBusyAction("");
    }
  }

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-lg border border-sky-900 bg-white shadow-soft">
        <div className="bg-sky-950 px-5 py-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-md bg-white text-sky-950">
                <Building2 size={26} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">
                  Election Commission of India
                </p>
                <h2 className="text-2xl font-bold">Administrative Control Centre</h2>
                <p className="mt-1 text-sm text-cyan-50">
                  Official officer dashboard for election setup, polling control, and result declaration.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <span className="rounded-md bg-white/10 px-3 py-2">
                Polling: {dashboard.paused ? "Paused" : dashboard.active ? "Live" : "Stopped"}
              </span>
              <span className="rounded-md bg-white/10 px-3 py-2">
                Result: {resultDeclaration.declared ? "Declared" : "Sealed"}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3">
          <span className="h-1 bg-orange-500" />
          <span className="h-1 bg-white" />
          <span className="h-1 bg-green-700" />
        </div>
      </section>

      {!adminWalletVerified ? (
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-soft">
          <h2 className="text-xl font-bold">Admin Wallet Verification Required</h2>
          <p className="mt-2 text-sm">
            Administrative actions are locked until the MetaMask wallet connected in the
            header matches the smart contract owner/admin address. This prevents local
            username/password access from controlling the election contract.
          </p>
          <p className="mt-3 text-sm">
            Connected wallet: <strong>{account || "Not connected"}</strong>
          </p>
          <p className="text-sm">
            Contract admin: <strong>{dashboard.admin || "Not available"}</strong>
          </p>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-5">
        <StatCard label="Election ID" value={dashboard.electionId || 2026} />
        <StatCard label="Candidates" value={dashboard.candidateCount} />
        <StatCard label="Registered Voters" value={dashboard.voterCount} />
        <StatCard
          label="Turnout"
          value={`${dashboard.turnoutPercent || 0}%`}
          detail={`${dashboard.totalVotes} votes cast`}
        />
        <StatCard
          label="Election State"
          value={dashboard.paused ? "Paused" : dashboard.active ? "Running" : "Stopped"}
          detail={`Rejected: ${dashboard.rejectedVotes || 0}`}
        />
      </div>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-sky-100 text-sky-900">
            <TimerReset size={20} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-brand">Election Master Setup</p>
            <h2 className="text-xl font-bold">Election ID and Polling Window</h2>
            <p className="text-sm text-slate-500">
              Configure the election identity and time window before polling starts.
            </p>
          </div>
        </div>
        <form className="grid gap-3 lg:grid-cols-[0.5fr_1fr_1fr_1fr_auto]" onSubmit={handleSettingsSubmit}>
          <input
            className="focus-ring rounded-md border border-line px-3 py-2"
            min="1"
            placeholder="Election ID"
            required
            type="number"
            value={settingsForm.electionId}
            onChange={(event) =>
              setSettingsForm((form) => ({ ...form, electionId: event.target.value }))
            }
          />
          <input
            className="focus-ring rounded-md border border-line px-3 py-2"
            placeholder="Election name"
            required
            value={settingsForm.electionName}
            onChange={(event) =>
              setSettingsForm((form) => ({ ...form, electionName: event.target.value }))
            }
          />
          <input
            className="focus-ring rounded-md border border-line px-3 py-2"
            type="datetime-local"
            value={settingsForm.startTime}
            onChange={(event) =>
              setSettingsForm((form) => ({ ...form, startTime: event.target.value }))
            }
          />
          <input
            className="focus-ring rounded-md border border-line px-3 py-2"
            type="datetime-local"
            value={settingsForm.endTime}
            onChange={(event) =>
              setSettingsForm((form) => ({ ...form, endTime: event.target.value }))
            }
          />
          <button
            className="focus-ring inline-flex items-center gap-2 rounded-md bg-sky-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={!adminWalletVerified || dashboard.active || dashboard.completed || busyAction === "settings"}
          >
            <TimerReset size={16} />
            Save
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-brand">Officer Operations</p>
            <h2 className="text-xl font-bold">Election Command Desk</h2>
            <p className="text-sm text-slate-500">
              Start polling, stop polling, and declare results in the correct administrative sequence.
            </p>
          </div>
          <div className="grid gap-1 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
            <span>Starts: {formatTimestamp(dashboard.startTime || dashboard.startedAt)}</span>
            <span>Ends: {formatTimestamp(dashboard.endTime || dashboard.endedAt)}</span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ControlCard
            description="Open the election for registered voters."
            icon={<Play size={18} />}
            title="Start Polling"
          >
            <button
              className="focus-ring inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={!adminWalletVerified || dashboard.active || busyAction === "start"}
              onClick={handleStartElection}
            >
              <Play size={16} />
              Start
            </button>
          </ControlCard>

          <ControlCard
            description="Close voting before final result declaration."
            icon={<Square size={18} />}
            title="Stop Polling"
          >
            <button
              className="focus-ring inline-flex items-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={!adminWalletVerified || !dashboard.active || busyAction === "stop"}
              onClick={() => runTransaction("stop", stopElection)}
            >
              <Square size={16} />
              Stop
            </button>
          </ControlCard>

          <ControlCard
            description="Emergency control for temporary suspension."
            icon={<Pause size={18} />}
            title="Pause Control"
          >
            <button
              className="focus-ring inline-flex items-center gap-2 rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={!adminWalletVerified || busyAction === "pause"}
              onClick={() => runTransaction("pause", dashboard.paused ? unpauseElection : pauseElection)}
            >
              <Pause size={16} />
              {dashboard.paused ? "Unpause" : "Pause"}
            </button>
          </ControlCard>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <ControlCard
            description="Publish final result for voter result panel."
            icon={<Megaphone size={18} />}
            title="Declare Result"
          >
            <button
              className="focus-ring inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={!adminWalletVerified || dashboard.active || resultDeclaration.declared}
              onClick={handleDeclareResult}
            >
              <Megaphone size={16} />
              {resultDeclaration.declared ? "Declared" : "Declare"}
            </button>
          </ControlCard>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase text-brand">Administrative Analytics</p>
          <h2 className="text-xl font-bold">Polling Statistics</h2>
          <p className="text-sm text-slate-500">
            Internal turnout and candidate vote charts for election officers only.
          </p>
        </div>
        <AnalyticsCharts dashboard={dashboard} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-orange-100 text-orange-700">
              <Plus size={20} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-brand">Candidate Setup</p>
              <h2 className="text-xl font-bold">Add Candidate</h2>
            </div>
          </div>
          <form className="grid gap-3" onSubmit={handleCandidateSubmit}>
            <input
              className="focus-ring rounded-md border border-line px-3 py-2"
              placeholder="Candidate name"
              required
              value={candidateForm.name}
              onChange={(event) =>
                setCandidateForm((form) => ({ ...form, name: event.target.value }))
              }
            />
            <input
              className="focus-ring rounded-md border border-line px-3 py-2"
              placeholder="Party name"
              required
              value={candidateForm.partyName}
              onChange={(event) =>
                setCandidateForm((form) => ({ ...form, partyName: event.target.value }))
              }
            />
            <input
              className="focus-ring rounded-md border border-line px-3 py-2"
              placeholder="Party symbol text or URL"
              value={candidateForm.symbolURI}
              onChange={(event) =>
                setCandidateForm((form) => ({ ...form, symbolURI: event.target.value }))
              }
            />
            <input
              className="focus-ring rounded-md border border-line px-3 py-2"
              placeholder="Manifesto PDF/link"
              value={candidateForm.manifestoURI}
              onChange={(event) =>
                setCandidateForm((form) => ({ ...form, manifestoURI: event.target.value }))
              }
            />
            <input
              className="focus-ring rounded-md border border-line px-3 py-2"
              placeholder="Candidate profile/photo link"
              value={candidateForm.profileURI}
              onChange={(event) =>
                setCandidateForm((form) => ({ ...form, profileURI: event.target.value }))
              }
            />
            <button
              className="focus-ring inline-flex w-max items-center gap-2 rounded-md bg-sky-950 px-4 py-2 text-sm font-semibold text-white"
              type="submit"
              disabled={!adminWalletVerified || busyAction === "candidate"}
            >
              <Plus size={16} />
              Add Candidate
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-green-100 text-green-700">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-brand">Blockchain Access</p>
              <h2 className="text-xl font-bold">Register Voter Wallet</h2>
            </div>
          </div>
          <form className="grid gap-3" onSubmit={handleVoterSubmit}>
            <input
              className="focus-ring rounded-md border border-line px-3 py-2"
              placeholder="0x voter wallet address"
              required
              value={voterAddress}
              onChange={(event) => setVoterAddress(event.target.value)}
            />
            <input
              className="focus-ring rounded-md border border-line px-3 py-2"
              placeholder="Optional SHA-256 identity hash from voter ID + DOB"
              value={voterIdentityHash}
              onChange={(event) => setVoterIdentityHash(event.target.value)}
            />
            <button
              className="focus-ring inline-flex w-max items-center gap-2 rounded-md bg-sky-950 px-4 py-2 text-sm font-semibold text-white"
              type="submit"
              disabled={!adminWalletVerified || busyAction === "voter"}
            >
              <UserPlus size={16} />
              Register Wallet
            </button>
          </form>
        </section>
      </div>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-brand">Approval Workflow</p>
            <h2 className="text-xl font-bold">Pending Voter Wallet Requests</h2>
            <p className="text-sm text-slate-500">
              Voters request approval from their wallet; officers approve the hashed identity on-chain.
            </p>
          </div>
          <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
            {registrationRequests.length} pending
          </span>
        </div>

        {registrationRequests.length ? (
          <div className="grid gap-3">
            {registrationRequests.map((request) => (
              <article
                className="grid gap-3 rounded-lg border border-line p-4 lg:grid-cols-[1fr_auto]"
                key={request.voter}
              >
                <div>
                  <p className="font-bold">{shortenAddress(request.voter)}</p>
                  <p className="text-sm text-slate-500">
                    Identity hash: <strong>{shortenHash(request.identityHash)}</strong>
                  </p>
                  <p className="text-xs text-slate-500">
                    Requested: {formatTimestamp(request.requestedAt)} | Block #{request.blockNumber}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="focus-ring inline-flex items-center gap-2 rounded-md bg-green-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    disabled={!adminWalletVerified || busyAction === `approve-${request.voter}`}
                    onClick={() =>
                      runTransaction(`approve-${request.voter}`, () => approveVoterRequest(request.voter))
                    }
                  >
                    <UserCheck size={15} />
                    Approve
                  </button>
                  <button
                    className="focus-ring inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    disabled={!adminWalletVerified || busyAction === `reject-${request.voter}`}
                    onClick={() =>
                      runTransaction(`reject-${request.voter}`, () => rejectVoterRequest(request.voter))
                    }
                  >
                    <AlertTriangle size={15} />
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">
            {extrasLoading ? "Loading registration requests..." : "No pending blockchain registration requests."}
          </p>
        )}
      </section>

      <AuditLog />
    </div>
  );
}

function ControlCard({ children, description, icon, title }) {
  return (
    <article className="rounded-lg border border-line bg-slate-50 p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-white text-sky-900 shadow-sm">
          {icon}
        </div>
        <h3 className="font-bold">{title}</h3>
      </div>
      <p className="mb-4 min-h-10 text-sm text-slate-500">{description}</p>
      {children}
    </article>
  );
}

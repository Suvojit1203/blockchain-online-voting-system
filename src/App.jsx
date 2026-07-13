import { useEffect, useMemo, useState } from "react";
import { BarChart3, LogOut, RefreshCw, Settings, Vote } from "lucide-react";
import AdminPanel from "./components/AdminPanel";
import BoltChatbot from "./components/BoltChatbot";
import ConnectButton from "./components/ConnectButton";
import EGovLogo from "./components/EGovLogo";
import LoginGateway from "./components/LoginGateway";
import ProfileMenu from "./components/ProfileMenu";
import ReminderBanner from "./components/ReminderBanner";
import ResultsPanel from "./components/ResultsPanel";
import VoterPanel from "./components/VoterPanel";
import { CONTRACT_CONFIG } from "./config/contractConfig";
import { DEMO_CANDIDATES } from "./config/demoCandidates";
import {
  getCurrentWallet,
  isContractConfigured,
  readElectionDashboard,
  shortenAddress
} from "./utils/contractHelpers";
import { getResultDeclaration as readResultDeclaration } from "./utils/localRegistry";

const emptyDashboard = {
  admin: "",
  isAdmin: false,
  registered: false,
  voted: false,
  identityHash: "",
  name: "State Assembly Digital Election 2026",
  electionId: 2026,
  active: true,
  paused: false,
  completed: false,
  resultDeclared: false,
  winnerId: 0,
  candidateCount: 4,
  voterCount: 240,
  totalVotes: 173,
  turnoutPercent: 72,
  rejectedVotes: 0,
  startedAt: 0,
  endedAt: 0,
  startTime: 0,
  endTime: 0,
  candidates: DEMO_CANDIDATES
};

const tabs = [
  { id: "voter", label: "Voter Panel", icon: Vote },
  { id: "results", label: "Results Panel", icon: BarChart3 },
  { id: "admin", label: "Admin Panel", icon: Settings }
];

export default function App() {
  const [authSession, setAuthSession] = useState(() => {
    const saved = localStorage.getItem("blockvote:session");
    return saved ? JSON.parse(saved) : null;
  });
  const [account, setAccount] = useState("");
  const [activeTab, setActiveTab] = useState("voter");
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [resultDeclaration, setResultDeclaration] = useState(() => readResultDeclaration());
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ message: "", type: "info" });
  const visibleTabs = useMemo(
    () =>
      authSession?.role === "admin"
        ? tabs.filter((tab) => tab.id === "admin")
        : tabs.filter((tab) => tab.id !== "admin"),
    [authSession?.role]
  );

  const statusClass = useMemo(() => {
    const styles = {
      success: "border-green-200 bg-green-50 text-green-800",
      error: "border-red-200 bg-red-50 text-red-800",
      info: "border-blue-200 bg-blue-50 text-blue-800"
    };

    return styles[status.type] || styles.info;
  }, [status.type]);
  const effectiveResultDeclaration = useMemo(
    () =>
      dashboard.resultDeclared
        ? {
            declared: true,
            declaredAt:
              resultDeclaration.declaredAt ||
              (dashboard.endedAt ? new Date(dashboard.endedAt * 1000).toISOString() : "")
          }
        : resultDeclaration,
    [dashboard.endedAt, dashboard.resultDeclared, resultDeclaration]
  );

  function showStatus(message, type = "info") {
    setStatus({ message, type });
  }

  function handlePortalLogin(session) {
    localStorage.setItem("blockvote:session", JSON.stringify(session));
    setAuthSession(session);
    setActiveTab(session.role === "admin" ? "admin" : "voter");
    showStatus(`Logged in as ${session.role === "admin" ? "administrator" : "voter"}.`, "success");
  }

  function handlePortalLogout() {
    localStorage.removeItem("blockvote:session");
    setAuthSession(null);
    setAccount("");
    setDashboard(emptyDashboard);
    setActiveTab("voter");
    showStatus("", "info");
  }

  function handleSessionUpdate(nextSession) {
    localStorage.setItem("blockvote:session", JSON.stringify(nextSession));
    setAuthSession(nextSession);
  }

  function handleResultDeclarationChange() {
    setResultDeclaration(readResultDeclaration());
  }

  async function refresh(accountOverride = account) {
    if (!isContractConfigured()) {
      showStatus("Deploy the contract and update src/config/contractConfig.js before connecting.", "error");
      return;
    }

    setLoading(true);

    try {
      const data = await readElectionDashboard(accountOverride);
      setDashboard(data);

      if (accountOverride && data.isAdmin && authSession?.role === "admin") {
        setActiveTab("admin");
      }
    } catch (error) {
      showStatus(error.reason || error.shortMessage || error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function restoreWallet() {
      try {
        const wallet = await getCurrentWallet();
        if (wallet) {
          setAccount(wallet);
          await refresh(wallet);
        }
      } catch {
        // Wallet restoration is optional on first load.
      }
    }

    restoreWallet();
  }, []);

  useEffect(() => {
    if (authSession?.role === "admin" && activeTab !== "admin") {
      setActiveTab("admin");
    }

    if (authSession?.role === "user" && activeTab === "admin") {
      setActiveTab("voter");
    }
  }, [authSession?.role, activeTab]);

  useEffect(() => {
    if (!window.ethereum) return undefined;

    function handleAccountsChanged(accounts) {
      const nextAccount = accounts[0] || "";
      setAccount(nextAccount);
      refresh(nextAccount);
    }

    function handleChainChanged() {
      window.location.reload();
    }

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [account]);

  function handleConnect(connectedAccount) {
    setAccount(connectedAccount);
    showStatus("Wallet connected successfully.", "success");
    refresh(connectedAccount);
  }

  function handleDisconnect() {
    setAccount("");
    setDashboard(emptyDashboard);
    setActiveTab("voter");
    showStatus("Wallet disconnected from the app.", "info");
  }

  const ActivePanel =
    activeTab === "admin" ? (
      <AdminPanel
        account={account}
        dashboard={dashboard}
        resultDeclaration={effectiveResultDeclaration}
        onRefresh={refresh}
        onResultDeclarationChange={handleResultDeclarationChange}
        onStatus={showStatus}
      />
    ) : activeTab === "results" ? (
      <ResultsPanel
        authSession={authSession}
        dashboard={dashboard}
        resultDeclaration={effectiveResultDeclaration}
      />
    ) : (
      <VoterPanel
        account={account}
        authSession={authSession}
        dashboard={dashboard}
        onRefresh={refresh}
        onStatus={showStatus}
      />
    );

  if (!authSession) {
    return <LoginGateway onLogin={handlePortalLogin} />;
  }

  return (
    <main className="min-h-screen vote-dashboard-bg">
      <header className="border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-full border border-slate-200 bg-white shadow-sm">
              <EGovLogo className="h-12 w-12" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Government of India</p>
              <h1 className="text-2xl font-bold text-orange-700">E-Election of India</h1>
              <p className="text-sm text-slate-500">
                Logged in as {authSession.role === "admin" ? "Election Officer" : "Voter"}:{" "}
                <strong>{authSession.displayName || authSession.id}</strong>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ProfileMenu
              authSession={authSession}
              onSessionUpdate={handleSessionUpdate}
              onStatus={showStatus}
            />
            <ConnectButton
              account={account}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onError={(message) => showStatus(message, "error")}
            />
            <button
              className="focus-ring inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              type="button"
              onClick={handlePortalLogout}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6">
        <ReminderBanner authSession={authSession} dashboard={dashboard} />

        <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              <strong>Network:</strong> {CONTRACT_CONFIG.networkName}
              <span className="mx-2 text-slate-300">|</span>
              <strong>Contract:</strong>{" "}
              {isContractConfigured() ? shortenAddress(CONTRACT_CONFIG.address) : "Not configured"}
              <span className="mx-2 text-slate-300">|</span>
              <strong>Portal Role:</strong> {authSession.role === "admin" ? "Administrator" : "Voter"}
              <span className="mx-2 text-slate-300">|</span>
              <strong>Wallet Role:</strong> {dashboard.isAdmin ? "Contract Admin" : "Voter Wallet"}
            </div>
            <button
              className="focus-ring inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              type="button"
              disabled={loading}
              onClick={() => refresh()}
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {status.message ? (
          <div className={`rounded-md border px-4 py-3 text-sm font-medium ${statusClass}`}>
            {status.message}
          </div>
        ) : null}

        {authSession.role !== "admin" ? (
          <nav className="flex flex-wrap gap-2">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  className={`focus-ring inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold ${
                    activeTab === tab.id
                      ? "bg-brand text-white"
                      : "border border-line bg-white text-slate-700 hover:bg-slate-50"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        ) : null}

        {ActivePanel}
      </section>

      <BoltChatbot authSession={authSession} />
    </main>
  );
}

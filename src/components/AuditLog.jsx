import { useEffect, useState } from "react";
import { ClipboardList, ExternalLink } from "lucide-react";
import { CONTRACT_CONFIG } from "../config/contractConfig";
import {
  formatTimestamp,
  getAuditLogs,
  shortenHash
} from "../utils/contractHelpers";
import { getVerificationAuditEvents } from "../utils/localRegistry";

function formatPortalTime(value) {
  if (!value) return "Not available";
  return new Date(value).toLocaleString();
}

export default function AuditLog({ limit = 40 }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [limit]);

  async function loadLogs() {
    setLoading(true);

    try {
      const [chainLogs, portalLogs] = await Promise.all([
        getAuditLogs(limit),
        Promise.resolve(getVerificationAuditEvents())
      ]);

      const normalizedChainLogs = chainLogs.map((log) => ({
        id: `${log.txHash}-${log.eventName}`,
        source: "Blockchain",
        eventName: log.eventName,
        detail: log.detail,
        blockNumber: log.blockNumber,
        txHash: log.txHash,
        timestampLabel: formatTimestamp(log.timestamp),
        sortTime: Number(log.timestamp || 0)
      }));

      const normalizedPortalLogs = portalLogs.map((log) => ({
        id: log.id,
        source: "Portal",
        eventName: log.type,
        detail: log.detail,
        blockNumber: log.blockNumber || "Off-chain",
        txHash: log.txHash || "",
        timestampLabel: formatPortalTime(log.timestamp),
        sortTime: Math.floor(new Date(log.timestamp).getTime() / 1000) || 0
      }));

      setLogs(
        [...normalizedChainLogs, ...normalizedPortalLogs]
          .sort((first, second) => second.sortTime - first.sortTime)
          .slice(0, limit)
      );
    } catch {
      setLogs(
        getVerificationAuditEvents().map((log) => ({
          id: log.id,
          source: "Portal",
          eventName: log.type,
          detail: log.detail,
          blockNumber: "Off-chain",
          txHash: "",
          timestampLabel: formatPortalTime(log.timestamp),
          sortTime: Math.floor(new Date(log.timestamp).getTime() / 1000) || 0
        }))
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-brand">Audit Trail</p>
          <h2 className="text-xl font-bold">Verification and Blockchain Events</h2>
          <p className="text-sm text-slate-500">
            Combined audit view for OTP, face verification, voter registration, vote casting,
            election start/stop, and result declaration.
          </p>
        </div>
        <button
          className="focus-ring rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-700"
          type="button"
          onClick={loadLogs}
        >
          Refresh
        </button>
      </div>

      {logs.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-slate-50 text-slate-600">
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Details</th>
                <th className="px-3 py-2">Block</th>
                <th className="px-3 py-2">Transaction</th>
                <th className="px-3 py-2">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr className="border-b border-line last:border-0" key={log.id}>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-bold ${
                        log.source === "Blockchain"
                          ? "bg-green-100 text-green-800"
                          : "bg-sky-100 text-sky-800"
                      }`}
                    >
                      {log.source}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-semibold">{log.eventName}</td>
                  <td className="px-3 py-2 text-slate-600">{log.detail}</td>
                  <td className="px-3 py-2">{log.blockNumber}</td>
                  <td className="px-3 py-2">
                    {log.txHash ? (
                      <a
                        className="inline-flex items-center gap-1 font-semibold text-sky-800 underline"
                        href={`${CONTRACT_CONFIG.blockExplorer}/tx/${log.txHash}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {shortenHash(log.txHash)}
                        <ExternalLink size={13} />
                      </a>
                    ) : (
                      <span className="text-slate-400">Local verification</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{log.timestampLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-line bg-slate-50 p-5 text-sm text-slate-500">
          <div className="mb-2 flex items-center gap-2 font-semibold text-slate-700">
            <ClipboardList size={16} />
            {loading ? "Loading audit log..." : "No audit records available yet."}
          </div>
          Complete OTP, Aadhaar, face verification, or blockchain transactions to populate this table.
        </div>
      )}
    </section>
  );
}

import { LogOut, Wallet } from "lucide-react";
import { CONTRACT_CONFIG } from "../config/contractConfig";
import { connectWallet, shortenAddress } from "../utils/contractHelpers";

export default function ConnectButton({ account, onConnect, onDisconnect, onError }) {
  async function handleConnect() {
    try {
      const connectedAccount = await connectWallet();
      onConnect(connectedAccount);
    } catch (error) {
      onError(error.message);
    }
  }

  if (account) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-md border border-line bg-white px-3 py-2 text-sm">
          <span className="block text-xs text-slate-500">{CONTRACT_CONFIG.networkName}</span>
          <strong>{shortenAddress(account)}</strong>
        </div>
        <button
          className="focus-ring inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          type="button"
          onClick={onDisconnect}
        >
          <LogOut size={16} />
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      className="focus-ring inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
      type="button"
      onClick={handleConnect}
    >
      <Wallet size={17} />
      Connect Wallet
    </button>
  );
}

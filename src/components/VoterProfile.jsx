import { CheckCircle2, UserCircle2, WalletCards, XCircle } from "lucide-react";
import { shortenAddress, shortenHash } from "../utils/contractHelpers";

function StatusPill({ active, label }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${
        active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"
      }`}
    >
      {active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {label}
    </span>
  );
}

export default function VoterProfile({ voter, walletAddress = "", dashboard }) {
  if (!voter) {
    return (
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <p className="text-sm text-slate-500">Voter profile not available.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border border-line bg-slate-100 text-brand">
            {voter.photo ? (
              <img className="h-full w-full object-cover" src={voter.photo} alt={voter.name} />
            ) : (
              <UserCircle2 size={34} />
            )}
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-brand">Voter Identity Page</p>
            <h2 className="text-2xl font-bold">{voter.name}</h2>
            <p className="text-sm text-slate-500">{voter.voterCard}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill active={voter.otpVerified} label="OTP" />
          <StatusPill active={voter.aadhaarVerified} label="Aadhaar" />
          <StatusPill active={voter.faceRegistered} label="Face Registered" />
          <StatusPill active={voter.faceVerified} label="Face Verified" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Info label="Voter ID" value={voter.voterCard} />
        <Info label="Date of Birth" value={voter.dateOfBirth} />
        <Info label="Mobile" value={voter.phone || "Not provided"} />
        <Info label="Email" value={voter.email || "Not provided"} />
        <Info
          icon={<WalletCards size={15} />}
          label="Wallet Address"
          value={walletAddress ? shortenAddress(walletAddress) : "Not connected"}
        />
        <Info
          label="Blockchain Status"
          value={dashboard?.registered ? "Registered wallet" : "Approval pending"}
        />
        <Info
          label="Identity Hash"
          value={dashboard?.identityHash ? shortenHash(dashboard.identityHash) : "Not on-chain"}
        />
        <Info
          label="Face Match"
          value={voter.faceMatchScore ? `${voter.faceMatchScore}%` : "Not verified today"}
        />
        <Info
          label="Last Face Verification"
          value={voter.lastFaceVerifiedAt ? new Date(voter.lastFaceVerifiedAt).toLocaleString() : "Not available"}
        />
      </div>
    </section>
  );
}

function Info({ icon, label, value }) {
  return (
    <div className="rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm">
      <strong className="mb-1 flex items-center gap-1 text-slate-600">
        {icon}
        {label}
      </strong>
      <span className="break-words">{value}</span>
    </div>
  );
}

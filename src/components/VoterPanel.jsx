import { useState } from "react";
import { FileText, ShieldCheck, UserPlus } from "lucide-react";
import {
  castVote,
  requestBlockchainVoterRegistration,
  shortenHash
} from "../utils/contractHelpers";
import {
  getVoterByCard,
  recordVerificationAudit,
  updateVoterFaceVerification
} from "../utils/localRegistry";
import CandidateSymbol from "./CandidateSymbol";
import FaceVerification from "./FaceVerification";
import OTPVerification from "./OTPVerification";
import VoterProfile from "./VoterProfile";

export default function VoterPanel({ account, authSession, dashboard, onRefresh, onStatus }) {
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [voteOtpVerified, setVoteOtpVerified] = useState(false);
  const [faceGate, setFaceGate] = useState({ verified: false, match: 0 });
  const voterProfile = getVoterByCard(authSession?.voterCard || authSession?.id || "");

  async function handleVote(event) {
    event.preventDefault();

    if (dashboard.voted) {
      onStatus("Vote already completed for this registered blockchain wallet.", "info");
      return;
    }

    if (!selectedCandidate) {
      onStatus("Please select a candidate.", "error");
      return;
    }

    if (!voteOtpVerified) {
      onStatus("Complete voting-day OTP verification before casting vote.", "error");
      return;
    }

    if (!faceGate.verified) {
      onStatus("Complete live face verification before casting vote.", "error");
      return;
    }

    setSubmitting(true);
    const candidate = dashboard.candidates.find(
      (item) => String(item.id) === String(selectedCandidate)
    );

    if (!candidate) {
      onStatus("Selected candidate was not found. Please refresh and try again.", "error");
      setSubmitting(false);
      return;
    }

    if (candidate.demoOnly) {
      onStatus("This candidate must be added on-chain before blockchain voting.", "error");
      setSubmitting(false);
      return;
    }

    onStatus("Confirm the blockchain vote transaction in MetaMask...", "info");

    try {
      await castVote(selectedCandidate);
      onStatus("Your vote has been permanently recorded on blockchain.", "success");
      setSelectedCandidate("");
      await onRefresh();
    } catch (error) {
      onStatus(error.reason || error.shortMessage || error.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegistrationRequest() {
    if (!account) {
      onStatus("Connect MetaMask before sending blockchain registration request.", "error");
      return;
    }

    if (!authSession?.voterCard || !authSession?.dateOfBirth) {
      onStatus("Login again so the portal can create your voter identity hash.", "error");
      return;
    }

    setRequesting(true);
    onStatus("Confirm the voter registration request in MetaMask...", "info");

    try {
      await requestBlockchainVoterRegistration(authSession.voterCard, authSession.dateOfBirth);
      onStatus("Registration request sent. Election officer can approve it from admin portal.", "success");
      await onRefresh();
    } catch (error) {
      onStatus(error.reason || error.shortMessage || error.message, "error");
    } finally {
      setRequesting(false);
    }
  }

  const canVote =
    Boolean(account) &&
    dashboard.registered &&
    !dashboard.voted &&
    dashboard.active &&
    !dashboard.paused &&
    voteOtpVerified &&
    faceGate.verified;

  return (
    <section className="grid gap-5">
    <VoterProfile voter={voterProfile} walletAddress={account} dashboard={dashboard} />

    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Voter Panel</h2>
          <p className="text-sm text-slate-500">Select one candidate and cast your secure vote.</p>
        </div>
        <div className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
          {dashboard.voted ? "Vote completed" : dashboard.registered ? "Registered wallet" : "Not registered"}
        </div>
      </div>

      {!dashboard.active ? (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Election is not active. Voting opens only after the admin starts the election.
        </div>
      ) : null}

      {dashboard.paused ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Election is temporarily paused by the election officer.
        </div>
      ) : null}

      {!dashboard.registered ? (
        <div className="mb-4 rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <strong>Wallet approval required</strong>
              <p>
                Send a hashed voter verification request, then the election officer can approve
                this wallet for blockchain voting.
              </p>
            </div>
            <button
              className="focus-ring inline-flex items-center gap-2 rounded-md bg-sky-950 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={!account || requesting}
              onClick={handleRegistrationRequest}
            >
              <UserPlus size={16} />
              Request Approval
            </button>
          </div>
        </div>
      ) : null}

      {dashboard.identityHash && dashboard.identityHash !== "0x0000000000000000000000000000000000000000000000000000000000000000" ? (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Verified identity hash: <strong>{shortenHash(dashboard.identityHash)}</strong>
        </div>
      ) : null}

      {!voteOtpVerified ? (
        <div className="mb-5">
          <OTPVerification
            mobile={voterProfile?.phone || ""}
            verified={voteOtpVerified}
            onVerified={(verified, mobile) => {
              setVoteOtpVerified(verified);
              if (verified) {
                recordVerificationAudit("OTP Verified", {
                  actor: voterProfile?.voterCard || mobile,
                  detail: `Voting-day OTP verified for ${voterProfile?.name || "voter"}.`
                });
                onStatus("Voting-day OTP verified. Continue with face verification.", "success");
              }
            }}
          />
        </div>
      ) : (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Voting-day OTP verification complete.
        </div>
      )}

      {voteOtpVerified && !faceGate.verified ? (
        <div className="mb-5">
          {voterProfile?.photo ? (
            <FaceVerification
              referenceImage={voterProfile.photo}
              title="Voting Day Face Verification"
              description="Verify live face against registration photo before candidate list is unlocked."
              onVerified={(result) => {
                setFaceGate(result);
                if (result.verified) {
                  updateVoterFaceVerification(voterProfile.voterCard, result);
                  onStatus(`Face verified with ${result.match}% match. Candidate list unlocked.`, "success");
                }
              }}
            />
          ) : (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Registration photograph not found. Update the voter registration profile before voting.
            </div>
          )}
        </div>
      ) : (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Face verification complete. Candidate list is unlocked for this voting session.
        </div>
      )}

      {faceGate.verified ? (
      <form className="grid gap-3" onSubmit={handleVote}>
        {dashboard.candidates.map((candidate) => (
          <label
            className="grid cursor-pointer gap-2 rounded-lg border border-line p-4 hover:border-brand"
            key={candidate.id}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="candidate"
                value={candidate.id}
                checked={String(selectedCandidate) === String(candidate.id)}
                disabled={!canVote}
                onChange={(event) => setSelectedCandidate(event.target.value)}
              />
              <CandidateSymbol candidate={candidate} />
              <span>
                <strong className="block">{candidate.name}</strong>
                <span className="text-sm text-slate-500">{candidate.party || candidate.details}</span>
                {candidate.manifestoURI ? (
                  <a
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-sky-800 underline"
                    href={candidate.manifestoURI}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <FileText size={12} />
                    Manifesto
                  </a>
                ) : null}
              </span>
            </span>
          </label>
        ))}

        <button
          className="focus-ring mt-2 inline-flex w-max items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={!canVote || submitting}
        >
          <ShieldCheck size={16} />
          Cast Secure Vote
        </button>
      </form>
      ) : null}
    </section>
    </section>
  );
}

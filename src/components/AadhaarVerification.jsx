import { useEffect, useState } from "react";
import { CheckCircle2, Fingerprint } from "lucide-react";
import { sha256, toUtf8Bytes } from "ethers";

function normalizeAadhaar(value) {
  return value.replace(/\D/g, "").slice(0, 12);
}

function isValidDob(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date <= new Date();
}

export default function AadhaarVerification({
  name = "",
  dateOfBirth = "",
  onVerified,
  verified: verifiedProp = false,
  hash: hashProp = ""
}) {
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [verified, setVerified] = useState(verifiedProp);
  const [identityHash, setIdentityHash] = useState(hashProp);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setVerified(verifiedProp);
  }, [verifiedProp]);

  useEffect(() => {
    setIdentityHash(hashProp || "");
  }, [hashProp]);

  function handleAadhaarChange(value) {
    setAadhaarNumber(normalizeAadhaar(value));
    setVerified(false);
    setIdentityHash("");
    setMessage("");
    onVerified?.({ verified: false, hash: "" });
  }

  function verifyIdentity() {
    const trimmedName = name.trim();

    if (aadhaarNumber.length !== 12) {
      setMessage("Aadhaar number must contain 12 digits.");
      return;
    }

    if (!trimmedName) {
      setMessage("Enter voter name before Aadhaar verification.");
      return;
    }

    if (!isValidDob(dateOfBirth)) {
      setMessage("Enter a valid date of birth before Aadhaar verification.");
      return;
    }

    const hash = sha256(toUtf8Bytes(`${aadhaarNumber}|${trimmedName.toUpperCase()}|${dateOfBirth}`));
    setVerified(true);
    setIdentityHash(hash);
    setMessage("Identity verified. Only SHA-256 hash will be stored.");
    onVerified?.({ verified: true, hash });
  }

  return (
    <section className="rounded-lg border border-orange-200 bg-orange-50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold uppercase text-orange-800">Aadhaar Simulation</p>
          <p className="text-xs text-slate-600">Demo identity check. No real Aadhaar API is used.</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${
            verified ? "bg-green-100 text-green-800" : "bg-white text-slate-600"
          }`}
        >
          {verified ? <CheckCircle2 size={14} /> : <Fingerprint size={14} />}
          {verified ? "Identity Verified" : "Pending"}
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <input
          className="focus-ring rounded-md border border-line bg-white px-3 py-2"
          inputMode="numeric"
          maxLength={12}
          placeholder="12-digit Aadhaar number"
          value={aadhaarNumber}
          onChange={(event) => handleAadhaarChange(event.target.value)}
        />
        <button
          className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-orange-700 px-3 py-2 text-sm font-semibold text-white"
          type="button"
          onClick={verifyIdentity}
        >
          <Fingerprint size={15} />
          Verify
        </button>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
        <span>Name: <strong>{name || "Not entered"}</strong></span>
        <span>DOB: <strong>{dateOfBirth || "Not entered"}</strong></span>
      </div>

      {identityHash ? (
        <p className="mt-2 break-all rounded-md bg-white px-3 py-2 text-xs text-slate-600">
          Stored hash: <strong>{identityHash}</strong>
        </p>
      ) : null}

      {message ? <p className="mt-2 text-xs font-semibold text-orange-900">{message}</p> : null}
    </section>
  );
}

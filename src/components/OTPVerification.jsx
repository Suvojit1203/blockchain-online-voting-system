import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";

function createOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function OTPVerification({
  mobile = "",
  onMobileChange,
  onVerified,
  verified: verifiedProp = false
}) {
  const [mobileNumber, setMobileNumber] = useState(mobile);
  const [otp, setOtp] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [verified, setVerified] = useState(verifiedProp);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMobileNumber(mobile || "");
  }, [mobile]);

  useEffect(() => {
    setVerified(verifiedProp);
  }, [verifiedProp]);

  function updateMobile(value) {
    const nextValue = value.replace(/\D/g, "").slice(0, 10);
    setMobileNumber(nextValue);
    setVerified(false);
    setOtp("");
    setEnteredOtp("");
    setMessage("");
    onMobileChange?.(nextValue);
    onVerified?.(false, nextValue);
  }

  function generateOtp() {
    if (mobileNumber.length !== 10) {
      setMessage("Enter a valid 10-digit mobile number.");
      return;
    }

    const nextOtp = createOtp();
    setOtp(nextOtp);
    setEnteredOtp("");
    setVerified(false);
    setMessage("OTP generated for demo verification.");
    onVerified?.(false, mobileNumber);
  }

  function verifyOtp() {
    if (!otp) {
      setMessage("Generate OTP first.");
      return;
    }

    if (enteredOtp !== otp) {
      setMessage("Incorrect OTP. Please try again.");
      return;
    }

    setVerified(true);
    setMessage("Mobile OTP verified successfully.");
    onVerified?.(true, mobileNumber);
  }

  return (
    <section className="rounded-lg border border-sky-200 bg-sky-50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold uppercase text-sky-900">OTP Verification</p>
          <p className="text-xs text-slate-600">Verify mobile number before registration.</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${
            verified ? "bg-green-100 text-green-800" : "bg-white text-slate-600"
          }`}
        >
          {verified ? <CheckCircle2 size={14} /> : <ShieldCheck size={14} />}
          {verified ? "Verified" : "Pending"}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          className="focus-ring rounded-md border border-line bg-white px-3 py-2"
          inputMode="numeric"
          maxLength={10}
          placeholder="10-digit mobile number"
          value={mobileNumber}
          onChange={(event) => updateMobile(event.target.value)}
        />
        <button
          className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-sky-950 px-3 py-2 text-sm font-semibold text-white"
          type="button"
          onClick={generateOtp}
        >
          <RefreshCw size={15} />
          Generate OTP
        </button>
      </div>

      {otp ? (
        <div className="mt-3 rounded-md border border-dashed border-sky-300 bg-white px-3 py-2 text-sm">
          Demo OTP: <strong className="tracking-widest">{otp}</strong>
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          className="focus-ring rounded-md border border-line bg-white px-3 py-2"
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter OTP"
          value={enteredOtp}
          onChange={(event) => setEnteredOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
        />
        <button
          className="focus-ring rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled={!otp || verified}
          onClick={verifyOtp}
        >
          Verify OTP
        </button>
      </div>

      {message ? <p className="mt-2 text-xs font-semibold text-sky-900">{message}</p> : null}
    </section>
  );
}

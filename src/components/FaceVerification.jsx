import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, ScanFace, ShieldAlert } from "lucide-react";
import * as faceapi from "face-api.js";

const MODEL_URL = "/models";
const FACE_DISTANCE_THRESHOLD = 0.5;

async function loadFaceModels() {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
  ]);
}

export default function FaceVerification({
  referenceImage,
  threshold = 50,
  onVerified,
  title = "Face Verification",
  description = "Capture live face image and compare with registration photograph."
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState("");
  const [matchPercent, setMatchPercent] = useState(0);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Camera access is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setMessage("Camera ready. Capture face to verify.");
    } catch {
      setMessage("Camera permission denied or unavailable.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  function captureImage() {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(image);
    setVerified(false);
    setMatchPercent(0);
    setMessage("Face captured. Run comparison to verify.");
  }

  async function compareFaces() {
    if (!referenceImage) {
      setMessage("Upload registration photograph before face verification.");
      return;
    }

    if (!capturedImage) {
      setMessage("Capture a live face image first.");
      return;
    }

    setBusy(true);

    try {
      try {
        await loadFaceModels();
        const reference = await faceapi.fetchImage(referenceImage);
        const captured = await faceapi.fetchImage(capturedImage);
        const options = new faceapi.TinyFaceDetectorOptions();
        const referenceResult = await faceapi
          .detectSingleFace(reference, options)
          .withFaceLandmarks()
          .withFaceDescriptor();
        const capturedResult = await faceapi
          .detectSingleFace(captured, options)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!referenceResult || !capturedResult) {
          throw new Error("Face not detected clearly.");
        }

        const distance = faceapi.euclideanDistance(
          referenceResult.descriptor,
          capturedResult.descriptor
        );
        const match = Math.round(Math.max(0, 1 - Math.min(distance, 1)) * 100);
        const isVerified = distance <= FACE_DISTANCE_THRESHOLD && match >= threshold;

        setMatchPercent(match);
        setVerified(isVerified);
        setMessage(
          isVerified
            ? "Face verified using secure face-api.js descriptor comparison."
            : `Face mismatch or weak confidence detected. Registration or voting is blocked. Required: ${threshold}%+ match and low descriptor distance.`
        );
        onVerified?.({ verified: isVerified, match, capturedImage, distance });
      } catch (error) {
        setMatchPercent(0);
        setVerified(false);
        setMessage(
          "Secure face verification failed. Add face-api model files in public/models and capture both faces clearly. No automatic demo match is allowed."
        );
        onVerified?.({ verified: false, match: 0, capturedImage, error: error.message });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-green-200 bg-green-50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold uppercase text-green-900">{title}</p>
          <p className="text-xs text-slate-600">{description}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${
            verified ? "bg-green-100 text-green-800" : "bg-white text-slate-600"
          }`}
        >
          {verified ? <CheckCircle2 size={14} /> : <ScanFace size={14} />}
          {verified ? "Face Verified" : "Pending"}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.7fr]">
        <div className="overflow-hidden rounded-lg border border-line bg-slate-950">
          <video
            className="aspect-video w-full object-cover"
            muted
            playsInline
            ref={videoRef}
          />
        </div>
        <div className="grid content-start gap-3">
          <button
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-sky-950 px-3 py-2 text-sm font-semibold text-white"
            type="button"
            onClick={cameraActive ? stopCamera : startCamera}
          >
            <Camera size={15} />
            {cameraActive ? "Stop Camera" : "Start Camera"}
          </button>
          <button
            className="focus-ring rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={!cameraActive}
            onClick={captureImage}
          >
            Capture Face
          </button>
          <button
            className="focus-ring rounded-md bg-green-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={!capturedImage || busy}
            onClick={compareFaces}
          >
            {busy ? "Comparing..." : "Compare Face"}
          </button>
        </div>
      </div>

      <canvas className="hidden" ref={canvasRef} />

      {capturedImage ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-[90px_1fr]">
          <img
            alt="Captured voter face"
            className="h-20 w-20 rounded-lg border border-line object-cover"
            src={capturedImage}
          />
          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-600">
              <span>Match Percentage</span>
              <span>{matchPercent}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white">
              <span
                className="block h-full rounded-full bg-green-700"
                style={{ width: `${matchPercent}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-green-900">
          {!verified && message.includes("below") ? <ShieldAlert size={14} /> : null}
          {message}
        </p>
      ) : null}
    </section>
  );
}

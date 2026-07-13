export const VOTER_CARD_PATTERN = /^[A-Z]{3}\d{7}$/;
export const ADMIN_ID_PATTERN = /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{7}$/;

const VOTERS_KEY = "blockvote:voters";
const ADMINS_KEY = "blockvote:admins";
const REQUESTS_KEY = "blockvote:voterCorrectionRequests";
const RESULT_DECLARATION_KEY = "blockvote:resultDeclaration";
const VERIFICATION_AUDIT_KEY = "blockvote:verificationAudit";

const defaultVoters = [
  {
    name: "Ananya Roy",
    voterCard: "ABC1234567",
    dateOfBirth: "1998-01-01",
    phone: "9876543210",
    email: "ananya.roy@example.com",
    photo: "",
    otpVerified: true,
    aadhaarVerified: true,
    aadhaarHash: "",
    faceRegistered: true,
    faceVerified: false,
    faceMatchScore: 0,
    lastFaceVerifiedAt: "",
    registeredAt: "2026-06-22T05:30:00.000Z",
    updatedAt: "2026-06-22T05:30:00.000Z"
  }
];

const defaultAdmins = [
  {
    username: "ADM2026",
    password: "Admin@123",
    phone: "9000000000",
    email: "admin@blockvote.local",
    registeredAt: "2026-06-22T05:30:00.000Z",
    updatedAt: "2026-06-22T05:30:00.000Z"
  }
];

function safeRead(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    return JSON.parse(saved);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function createRequestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `REQ-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeName(value) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeVoterCard(value) {
  return value.trim().toUpperCase();
}

export function normalizeAdminId(value) {
  return value.trim().toUpperCase();
}

export function getAge(dateOfBirth) {
  if (!dateOfBirth) return 0;

  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

export function getVoters() {
  const voters = safeRead(VOTERS_KEY, defaultVoters);
  if (!localStorage.getItem(VOTERS_KEY)) writeJson(VOTERS_KEY, voters);
  return voters;
}

export function saveVoters(voters) {
  writeJson(VOTERS_KEY, voters);
}

export function getAdmins() {
  const admins = safeRead(ADMINS_KEY, defaultAdmins);
  if (!localStorage.getItem(ADMINS_KEY)) writeJson(ADMINS_KEY, admins);
  return admins;
}

export function saveAdmins(admins) {
  writeJson(ADMINS_KEY, admins);
}

export function getCorrectionRequests() {
  return safeRead(REQUESTS_KEY, []);
}

export function saveCorrectionRequests(requests) {
  writeJson(REQUESTS_KEY, requests);
}

export function getVerificationAuditEvents() {
  return safeRead(VERIFICATION_AUDIT_KEY, []);
}

export function recordVerificationAudit(type, data = {}) {
  const events = getVerificationAuditEvents();
  const event = {
    id: createRequestId(),
    type,
    actor: data.actor || data.voterCard || data.wallet || "Portal User",
    detail: data.detail || type,
    timestamp: new Date().toISOString(),
    txHash: data.txHash || "",
    blockNumber: data.blockNumber || ""
  };

  writeJson(VERIFICATION_AUDIT_KEY, [event, ...events].slice(0, 100));
  return event;
}

export function getResultDeclaration() {
  return safeRead(RESULT_DECLARATION_KEY, {
    declared: false,
    declaredAt: ""
  });
}

export function declareElectionResult() {
  const declaration = {
    declared: true,
    declaredAt: new Date().toISOString()
  };

  writeJson(RESULT_DECLARATION_KEY, declaration);
  return declaration;
}

export function resetElectionResultDeclaration() {
  const declaration = {
    declared: false,
    declaredAt: ""
  };

  writeJson(RESULT_DECLARATION_KEY, declaration);
  return declaration;
}

export function validateVoterCard(value) {
  return VOTER_CARD_PATTERN.test(normalizeVoterCard(value));
}

export function validateAdminId(value) {
  return ADMIN_ID_PATTERN.test(normalizeAdminId(value));
}

export function findVoterForLogin(name, voterCard) {
  const normalizedName = normalizeName(name).toLowerCase();
  const normalizedCard = normalizeVoterCard(voterCard);

  return getVoters().find(
    (voter) =>
      voter.name.toLowerCase() === normalizedName &&
      normalizeVoterCard(voter.voterCard) === normalizedCard
  );
}

export function getVoterByCard(voterCard) {
  const normalizedCard = normalizeVoterCard(voterCard || "");
  return getVoters().find((voter) => normalizeVoterCard(voter.voterCard) === normalizedCard);
}

export function registerVoterRecord(data) {
  const name = normalizeName(data.name || "");
  const voterCard = normalizeVoterCard(data.voterCard || "");
  const dateOfBirth = data.dateOfBirth || "";
  const phone = data.phone?.trim() || "";
  const email = data.email?.trim() || "";
  const photo = data.photo || "";
  const otpVerified = Boolean(data.otpVerified);
  const aadhaarVerified = Boolean(data.aadhaarVerified);
  const aadhaarHash = data.aadhaarHash || "";
  const faceRegistered = Boolean(data.faceRegistered);
  const faceMatchScore = Number(data.faceMatchScore || 0);
  const voters = getVoters();

  if (!name) throw new Error("Voter name is required.");
  if (!validateVoterCard(voterCard)) {
    throw new Error("Voter card must start with 3 capital letters followed by 7 digits.");
  }
  if (getAge(dateOfBirth) < 18) {
    throw new Error("Voter must be 18 years or older at registration time.");
  }
  if (!otpVerified) throw new Error("Mobile OTP verification is required.");
  if (!aadhaarVerified || !aadhaarHash) throw new Error("Aadhaar simulation verification is required.");
  if (!photo) throw new Error("Current voter photo is required during registration.");
  if (!faceRegistered) throw new Error("Face registration verification is required.");

  const duplicateCard = voters.some(
    (voter) => normalizeVoterCard(voter.voterCard) === voterCard
  );
  if (duplicateCard) throw new Error("This voter card number is already registered.");

  const duplicatePerson = voters.some(
    (voter) =>
      voter.name.toLowerCase() === name.toLowerCase() && voter.dateOfBirth === dateOfBirth
  );
  if (duplicatePerson) throw new Error("One person can register only one voter record.");

  const now = new Date().toISOString();
  const voter = {
    name,
    voterCard,
    dateOfBirth,
    phone,
    email,
    photo,
    otpVerified,
    aadhaarVerified,
    aadhaarHash,
    faceRegistered,
    faceVerified: false,
    faceMatchScore,
    lastFaceVerifiedAt: "",
    registeredAt: now,
    updatedAt: now
  };

  saveVoters([...voters, voter]);
  recordVerificationAudit("Voter Registered", {
    voterCard,
    actor: voterCard,
    detail: `${name} registered with OTP, Aadhaar hash, and face registration.`
  });
  return voter;
}

export function updateVoterFaceVerification(voterCard, data = {}) {
  const normalizedCard = normalizeVoterCard(voterCard || "");
  const voters = getVoters();
  const index = voters.findIndex((voter) => normalizeVoterCard(voter.voterCard) === normalizedCard);

  if (index === -1) throw new Error("Voter profile not found.");

  const updated = {
    ...voters[index],
    faceVerified: Boolean(data.verified),
    faceMatchScore: Number(data.match || 0),
    lastFaceVerifiedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  voters[index] = updated;
  saveVoters(voters);
  recordVerificationAudit("Face Verified", {
    voterCard: updated.voterCard,
    actor: updated.voterCard,
    detail: `${updated.name} face verification match ${updated.faceMatchScore}%.`
  });
  return updated;
}

export function updateVoterProfile(voterCard, updates) {
  const normalizedCard = normalizeVoterCard(voterCard || "");
  const voters = getVoters();
  const index = voters.findIndex((voter) => normalizeVoterCard(voter.voterCard) === normalizedCard);

  if (index === -1) throw new Error("Voter profile not found.");

  const nextName = normalizeName(updates.name || voters[index].name);
  if (!nextName) throw new Error("Name cannot be empty.");

  const updated = {
    ...voters[index],
    name: nextName,
    phone: updates.phone?.trim() || "",
    email: updates.email?.trim() || "",
    updatedAt: new Date().toISOString()
  };

  const nextVoters = [...voters];
  nextVoters[index] = updated;
  saveVoters(nextVoters);
  return updated;
}

export function findAdminForLogin(username, password) {
  const normalizedUsername = normalizeAdminId(username || "");

  return getAdmins().find(
    (admin) => admin.username === normalizedUsername && admin.password === password
  );
}

export function getAdminByUsername(username) {
  const normalizedUsername = normalizeAdminId(username || "");
  return getAdmins().find((admin) => admin.username === normalizedUsername);
}

export function registerAdminRecord(data) {
  const username = normalizeAdminId(data.username || "");
  const password = data.password || `${username}@123`;
  const phone = data.phone?.trim() || "";
  const email = data.email?.trim() || "";
  const admins = getAdmins();

  if (!validateAdminId(username)) {
    throw new Error("Administrator ID must be 7 alphanumeric characters with letters and digits.");
  }
  if (!phone || !email) throw new Error("Mobile number and email ID are required.");
  if (admins.some((admin) => admin.username === username)) {
    throw new Error("This administrator ID is already registered.");
  }

  const now = new Date().toISOString();
  const admin = {
    username,
    password,
    phone,
    email,
    registeredAt: now,
    updatedAt: now
  };

  saveAdmins([...admins, admin]);
  return admin;
}

export function updateAdminProfile(username, updates) {
  const normalizedUsername = normalizeAdminId(username || "");
  const admins = getAdmins();
  const index = admins.findIndex((admin) => admin.username === normalizedUsername);

  if (index === -1) throw new Error("Administrator profile not found.");

  const updated = {
    ...admins[index],
    phone: updates.phone?.trim() || "",
    email: updates.email?.trim() || "",
    password: updates.password || admins[index].password,
    updatedAt: new Date().toISOString()
  };

  const nextAdmins = [...admins];
  nextAdmins[index] = updated;
  saveAdmins(nextAdmins);
  return updated;
}

export function createVoterCorrectionRequest(voterCard, data) {
  const voter = getVoterByCard(voterCard);
  if (!voter) throw new Error("Voter profile not found.");

  const requestedVoterCard = data.requestedVoterCard
    ? normalizeVoterCard(data.requestedVoterCard)
    : "";
  const requestedDateOfBirth = data.requestedDateOfBirth || "";

  if (!requestedVoterCard && !requestedDateOfBirth) {
    throw new Error("Enter a voter card or date of birth correction.");
  }
  if (requestedVoterCard && !validateVoterCard(requestedVoterCard)) {
    throw new Error("Requested voter card must be 3 capital letters followed by 7 digits.");
  }
  if (requestedDateOfBirth && getAge(requestedDateOfBirth) < 18) {
    throw new Error("Requested date of birth must still make the voter 18 or older.");
  }
  if (
    requestedVoterCard &&
    requestedVoterCard !== normalizeVoterCard(voter.voterCard) &&
    getVoters().some((item) => normalizeVoterCard(item.voterCard) === requestedVoterCard)
  ) {
    throw new Error("Requested voter card is already used by another voter.");
  }

  const requests = getCorrectionRequests();
  const pending = requests.some(
    (request) => request.voterCard === voter.voterCard && request.status === "Pending"
  );
  if (pending) throw new Error("A correction request is already pending for this voter.");

  const request = {
    id: createRequestId(),
    voterCard: voter.voterCard,
    voterName: voter.name,
    currentDateOfBirth: voter.dateOfBirth,
    requestedVoterCard,
    requestedDateOfBirth,
    reason: data.reason?.trim() || "Correction requested by voter",
    status: "Pending",
    requestedAt: new Date().toISOString(),
    decidedAt: ""
  };

  saveCorrectionRequests([...requests, request]);
  return request;
}

export function approveCorrectionRequest(requestId) {
  const requests = getCorrectionRequests();
  const requestIndex = requests.findIndex((request) => request.id === requestId);
  if (requestIndex === -1) throw new Error("Correction request not found.");

  const request = requests[requestIndex];
  if (request.status !== "Pending") throw new Error("This request is already closed.");

  const voters = getVoters();
  const voterIndex = voters.findIndex((voter) => voter.voterCard === request.voterCard);
  if (voterIndex === -1) throw new Error("Voter profile not found.");

  const nextVoterCard = request.requestedVoterCard || voters[voterIndex].voterCard;
  if (
    nextVoterCard !== voters[voterIndex].voterCard &&
    voters.some((voter) => voter.voterCard === nextVoterCard)
  ) {
    throw new Error("Requested voter card is already used.");
  }

  voters[voterIndex] = {
    ...voters[voterIndex],
    voterCard: nextVoterCard,
    dateOfBirth: request.requestedDateOfBirth || voters[voterIndex].dateOfBirth,
    updatedAt: new Date().toISOString()
  };

  requests[requestIndex] = {
    ...request,
    status: "Approved",
    decidedAt: new Date().toISOString()
  };

  saveVoters(voters);
  saveCorrectionRequests(requests);
  return voters[voterIndex];
}

export function rejectCorrectionRequest(requestId) {
  const requests = getCorrectionRequests();
  const requestIndex = requests.findIndex((request) => request.id === requestId);
  if (requestIndex === -1) throw new Error("Correction request not found.");

  requests[requestIndex] = {
    ...requests[requestIndex],
    status: "Rejected",
    decidedAt: new Date().toISOString()
  };

  saveCorrectionRequests(requests);
  return requests[requestIndex];
}

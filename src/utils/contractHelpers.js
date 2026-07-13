import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  isAddress,
  sha256,
  toUtf8Bytes
} from "ethers";
import abi from "../config/abi.json";
import { CONTRACT_CONFIG, ZERO_ADDRESS } from "../config/contractConfig";
import { DEMO_CANDIDATES } from "../config/demoCandidates";

export function isContractConfigured() {
  return Boolean(CONTRACT_CONFIG.address && CONTRACT_CONFIG.address !== ZERO_ADDRESS);
}

export function shortenAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function shortenHash(hash) {
  if (!hash) return "";
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

export function formatTimestamp(value) {
  const timestamp = Number(value);
  if (!timestamp) return "Not set";
  return new Date(timestamp * 1000).toLocaleString();
}

export function formatCountdown(seconds) {
  const safeSeconds = Math.max(Number(seconds) || 0, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function buildVoterIdentityHash(voterCard, dateOfBirth) {
  if (!voterCard || !dateOfBirth) {
    throw new Error("Voter card and date of birth are required to create identity hash.");
  }

  return sha256(toUtf8Bytes(`${voterCard.trim().toUpperCase()}|${dateOfBirth}`));
}

export function ensureEthereum() {
  if (!window.ethereum) {
    throw new Error("MetaMask or another Web3 wallet is required.");
  }
}

export async function connectWallet() {
  ensureEthereum();

  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts"
  });

  await switchToConfiguredNetwork();
  return accounts[0];
}

export async function getCurrentWallet() {
  ensureEthereum();

  const accounts = await window.ethereum.request({
    method: "eth_accounts"
  });

  return accounts[0] || "";
}

export async function switchToConfiguredNetwork() {
  ensureEthereum();

  const currentChainId = await window.ethereum.request({
    method: "eth_chainId"
  });

  if (currentChainId === CONTRACT_CONFIG.chainId) {
    return;
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CONTRACT_CONFIG.chainId }]
    });
  } catch (error) {
    if (error.code === 4902) {
      throw new Error(`${CONTRACT_CONFIG.networkName} is not added to this wallet.`);
    }

    throw error;
  }
}

export function validateContractConfig() {
  if (!isContractConfigured()) {
    throw new Error("Please deploy the smart contract and update contractConfig.js.");
  }
}

export async function getBrowserProvider() {
  ensureEthereum();
  await switchToConfiguredNetwork();
  return new BrowserProvider(window.ethereum);
}

export function getReadOnlyProvider() {
  if (CONTRACT_CONFIG.rpcUrl.includes("YOUR_INFURA_PROJECT_ID")) {
    return null;
  }

  return new JsonRpcProvider(CONTRACT_CONFIG.rpcUrl);
}

export async function getSignerContract() {
  validateContractConfig();

  const provider = await getBrowserProvider();
  const signer = await provider.getSigner();
  return new Contract(CONTRACT_CONFIG.address, abi, signer);
}

export async function getReadOnlyContract() {
  validateContractConfig();

  const readOnlyProvider = getReadOnlyProvider();
  if (readOnlyProvider) {
    return new Contract(CONTRACT_CONFIG.address, abi, readOnlyProvider);
  }

  const provider = await getBrowserProvider();
  return new Contract(CONTRACT_CONFIG.address, abi, provider);
}

async function callOptional(contract, functionName, args = [], fallback = null) {
  try {
    if (typeof contract[functionName] !== "function") return fallback;
    return await contract[functionName](...args);
  } catch {
    return fallback;
  }
}

function toNumber(value) {
  return Number(value || 0);
}

function readIndexed(result, key, index, fallback = undefined) {
  if (!result) return fallback;
  return result[key] ?? result[index] ?? fallback;
}

function parseElectionTiming(timing) {
  return {
    electionId: toNumber(readIndexed(timing, "configuredElectionId", 0, 2026)),
    startTime: toNumber(readIndexed(timing, "configuredStartTime", 1, 0)),
    endTime: toNumber(readIndexed(timing, "configuredEndTime", 2, 0)),
    paused: Boolean(readIndexed(timing, "isPaused", 3, false)),
    completed: Boolean(readIndexed(timing, "isCompleted", 4, false)),
    resultDeclared: Boolean(readIndexed(timing, "isResultDeclared", 5, false)),
    winnerId: toNumber(readIndexed(timing, "winnerId", 6, 0))
  };
}

export async function readElectionDashboard(account) {
  const contract = await getReadOnlyContract();
  const summary = await contract.getElectionSummary();
  const timing = parseElectionTiming(await callOptional(contract, "getElectionTiming"));
  const admin = await contract.admin();
  const candidates = await getCandidates(contract, Number(summary.candidatesTotal));
  const displayCandidates = mergeDisplayCandidates(candidates);
  const voterCount = Number(summary.votersTotal);
  const totalVotes = Number(summary.votesTotal);

  let registered = false;
  let voted = false;
  let identityHash = "";

  if (account && isAddress(account)) {
    registered = await contract.isRegisteredVoter(account);
    voted = await contract.hasVoted(account);
    identityHash = (await callOptional(contract, "voterHash", [account], "")) || "";
  }

  return {
    admin,
    isAdmin: account ? admin.toLowerCase() === account.toLowerCase() : false,
    registered,
    voted,
    identityHash,
    name: summary.name,
    active: summary.active,
    candidateCount: Math.max(Number(summary.candidatesTotal), displayCandidates.length),
    voterCount,
    totalVotes,
    turnoutPercent: voterCount ? Math.round((totalVotes / voterCount) * 100) : 0,
    rejectedVotes: 0,
    startedAt: Number(summary.startedAt),
    endedAt: Number(summary.endedAt),
    candidates: displayCandidates,
    ...timing
  };
}

export function mergeDisplayCandidates(blockchainCandidates) {
  const merged = [...blockchainCandidates];
  const usedNames = new Set(merged.map((candidate) => candidate.name.toLowerCase()));

  DEMO_CANDIDATES.forEach((candidate) => {
    if (merged.length >= 4) return;
    if (usedNames.has(candidate.name.toLowerCase())) return;

    merged.push({
      ...candidate,
      id: merged.length + 1,
      voteCount: 0,
      exists: false,
      demoOnly: true
    });
  });

  return merged;
}

function isImageReference(value) {
  return /^(https?:\/\/|data:image\/|ipfs:\/\/)/i.test(value || "");
}

function symbolFromProfile(profile, fallbackSymbol, candidateName) {
  if (profile.symbolURI && !isImageReference(profile.symbolURI)) {
    return profile.symbolURI.slice(0, 4).toUpperCase();
  }

  return fallbackSymbol || candidateName?.slice(0, 2).toUpperCase() || "ID";
}

function normalizeProfile(profile) {
  if (!profile) return {};

  return {
    partyName: readIndexed(profile, "partyName", 0, ""),
    symbolURI: readIndexed(profile, "symbolURI", 1, ""),
    manifestoURI: readIndexed(profile, "manifestoURI", 2, ""),
    profileURI: readIndexed(profile, "profileURI", 3, ""),
    education: readIndexed(profile, "education", 4, ""),
    criminalCases: readIndexed(profile, "criminalCases", 5, ""),
    assets: readIndexed(profile, "assets", 6, ""),
    exists: Boolean(readIndexed(profile, "exists", 7, false))
  };
}

function decorateCandidate(candidate, profile = {}) {
  const normalizedProfile = normalizeProfile(profile);
  const match = DEMO_CANDIDATES.find(
    (item) => item.name.toLowerCase() === candidate.name.toLowerCase()
  );
  const party = normalizedProfile.partyName || match?.party || candidate.details || "Independent Digital Party";
  const symbolURI = normalizedProfile.symbolURI || "";

  return {
    ...candidate,
    party,
    details: party,
    symbol: symbolFromProfile(normalizedProfile, match?.symbol, candidate.name),
    symbolURI: isImageReference(symbolURI) ? symbolURI : "",
    symbolBg: match?.symbolBg || "#64748b",
    manifestoURI: normalizedProfile.manifestoURI || "",
    profileURI: normalizedProfile.profileURI || "",
    education: normalizedProfile.education || "",
    criminalCases: normalizedProfile.criminalCases || "",
    assets: normalizedProfile.assets || ""
  };
}

export async function getCandidates(contract, candidateCount) {
  const ids = Array.from({ length: candidateCount }, (_, index) => index + 1);

  const candidates = await Promise.all(
    ids.map(async (id) => {
      const candidate = await contract.candidates(id);
      const profile = await callOptional(contract, "getCandidateProfile", [id]);

      return decorateCandidate(
        {
          id: Number(candidate.id),
          name: candidate.name,
          details: candidate.details,
          voteCount: Number(candidate.voteCount),
          exists: candidate.exists
        },
        profile
      );
    })
  );

  return candidates.filter((candidate) => candidate.exists);
}

export async function addCandidate(candidateInput, legacyDetails = "") {
  const payload =
    typeof candidateInput === "object"
      ? candidateInput
      : {
          name: candidateInput,
          partyName: legacyDetails,
          symbolURI: "",
          manifestoURI: "",
          profileURI: ""
        };
  const contract = await getSignerContract();

  if (contract.addCandidateWithProfile) {
    try {
      const tx = await contract.addCandidateWithProfile(
        payload.name,
        payload.partyName,
        payload.symbolURI,
        payload.manifestoURI,
        payload.profileURI
      );
      return tx.wait();
    } catch (error) {
      if (!contract.addCandidate) throw error;
    }
  }

  const tx = await contract.addCandidate(payload.name, payload.partyName);
  return tx.wait();
}

export async function registerVoter(address, identityHash = "") {
  if (!isAddress(address)) {
    throw new Error("Enter a valid Ethereum wallet address.");
  }

  const contract = await getSignerContract();

  if (identityHash && contract.registerVoterWithHash) {
    try {
      const tx = await contract.registerVoterWithHash(address, identityHash);
      return tx.wait();
    } catch (error) {
      if (!contract.registerVoter) throw error;
    }
  }

  const tx = await contract.registerVoter(address);
  return tx.wait();
}

export async function requestBlockchainVoterRegistration(voterCard, dateOfBirth) {
  const identityHash = buildVoterIdentityHash(voterCard, dateOfBirth);
  const contract = await getSignerContract();
  const tx = await contract.requestVoterRegistration(identityHash);
  return tx.wait();
}

export async function approveVoterRequest(voterAddress) {
  if (!isAddress(voterAddress)) {
    throw new Error("Invalid voter wallet address.");
  }

  const contract = await getSignerContract();
  const tx = await contract.approveVoter(voterAddress);
  return tx.wait();
}

export async function rejectVoterRequest(voterAddress) {
  if (!isAddress(voterAddress)) {
    throw new Error("Invalid voter wallet address.");
  }

  const contract = await getSignerContract();
  const tx = await contract.rejectVoterRequest(voterAddress);
  return tx.wait();
}

export async function configureElection({ electionId, electionName, startTime, endTime }) {
  const contract = await getSignerContract();
  const tx = await contract.configureElection(
    Number(electionId),
    electionName,
    toEpochSeconds(startTime),
    toEpochSeconds(endTime)
  );
  return tx.wait();
}

function toEpochSeconds(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  return Math.floor(new Date(value).getTime() / 1000);
}

export async function startElection() {
  const contract = await getSignerContract();
  const tx = await contract.startElection();
  return tx.wait();
}

export async function stopElection() {
  const contract = await getSignerContract();
  const tx = await contract.stopElection();
  return tx.wait();
}

export async function pauseElection() {
  const contract = await getSignerContract();
  const tx = await contract.pauseElection();
  return tx.wait();
}

export async function unpauseElection() {
  const contract = await getSignerContract();
  const tx = await contract.unpauseElection();
  return tx.wait();
}

export async function declareResultOnChain() {
  const contract = await getSignerContract();
  const tx = await contract.declareResult();
  return tx.wait();
}

export async function castVote(candidateId) {
  const contract = await getSignerContract();
  const tx = await contract.vote(candidateId);
  return tx.wait();
}

function hasEvent(contract, eventName) {
  try {
    contract.interface.getEvent(eventName);
    return true;
  } catch {
    return false;
  }
}

function getEventArg(args, key, index, fallback = "") {
  return args?.[key] ?? args?.[index] ?? fallback;
}

function formatAuditDetail(eventName, args) {
  const details = {
    ElectionConfigured: () =>
      `Election ${getEventArg(args, "electionId", 0)} configured as ${getEventArg(args, "electionName", 1)}.`,
    ElectionScheduleSet: () =>
      `Polling window set from ${formatTimestamp(getEventArg(args, "startTime", 0))} to ${formatTimestamp(
        getEventArg(args, "endTime", 1)
      )}.`,
    ElectionStarted: () => "Election polling started.",
    ElectionStopped: () => "Election polling stopped.",
    CandidateAdded: () =>
      `${getEventArg(args, "name", 1)} added as candidate #${getEventArg(args, "candidateId", 0)}.`,
    CandidateProfileUpdated: () =>
      `Candidate #${getEventArg(args, "candidateId", 0)} profile updated for ${getEventArg(
        args,
        "partyName",
        1
      )}.`,
    VoterRegistered: () => `${shortenAddress(getEventArg(args, "voter", 0))} registered as voter.`,
    VoterIdentityHashUpdated: () =>
      `Identity hash stored for ${shortenAddress(getEventArg(args, "voter", 0))}.`,
    VoterRegistrationRequested: () =>
      `${shortenAddress(getEventArg(args, "voter", 0))} requested wallet-based voter approval.`,
    VoterRegistrationApproved: () =>
      `${shortenAddress(getEventArg(args, "voter", 0))} approved for voting.`,
    VoterRegistrationRejected: () =>
      `${shortenAddress(getEventArg(args, "voter", 0))} registration request rejected.`,
    VoteCast: () =>
      `Vote transaction recorded for candidate #${getEventArg(args, "candidateId", 1)}.`,
    ResultDeclared: () =>
      `Result declared. Winner candidate #${getEventArg(args, "winnerId", 0)} with ${getEventArg(
        args,
        "winnerVotes",
        1
      )} votes.`,
    Paused: () => `Emergency pause activated by ${shortenAddress(getEventArg(args, "officer", 0))}.`,
    Unpaused: () => `Emergency pause removed by ${shortenAddress(getEventArg(args, "officer", 0))}.`,
    OwnershipTransferred: () =>
      `Admin changed from ${shortenAddress(getEventArg(args, "previousAdmin", 0))} to ${shortenAddress(
        getEventArg(args, "newAdmin", 1)
      )}.`
  };

  return details[eventName]?.() || `${eventName} recorded on blockchain.`;
}

export async function getAuditLogs(limit = 30) {
  const contract = await getReadOnlyContract();
  const provider = contract.runner?.provider || getReadOnlyProvider();
  const eventNames = [
    "ElectionConfigured",
    "ElectionScheduleSet",
    "ElectionStarted",
    "ElectionStopped",
    "CandidateAdded",
    "CandidateProfileUpdated",
    "VoterRegistered",
    "VoterIdentityHashUpdated",
    "VoterRegistrationRequested",
    "VoterRegistrationApproved",
    "VoterRegistrationRejected",
    "VoteCast",
    "ResultDeclared",
    "Paused",
    "Unpaused",
    "OwnershipTransferred"
  ];
  const fromBlock = CONTRACT_CONFIG.deploymentBlock || 0;
  const logs = [];

  await Promise.all(
    eventNames.map(async (eventName) => {
      if (!hasEvent(contract, eventName)) return;

      try {
        const filter = contract.filters[eventName]();
        const eventLogs = await contract.queryFilter(filter, fromBlock, "latest");
        logs.push(...eventLogs.map((eventLog) => ({ eventName, eventLog })));
      } catch {
        // Some public RPC endpoints reject wide event queries. The UI will show an empty log.
      }
    })
  );

  const blockCache = new Map();
  const sorted = logs.sort((first, second) => {
    if (first.eventLog.blockNumber !== second.eventLog.blockNumber) {
      return second.eventLog.blockNumber - first.eventLog.blockNumber;
    }

    return (second.eventLog.index || 0) - (first.eventLog.index || 0);
  });

  const enriched = await Promise.all(
    sorted.slice(0, limit).map(async ({ eventName, eventLog }) => {
      let timestamp = 0;

      if (provider) {
        if (!blockCache.has(eventLog.blockNumber)) {
          blockCache.set(eventLog.blockNumber, await provider.getBlock(eventLog.blockNumber));
        }
        timestamp = Number(blockCache.get(eventLog.blockNumber)?.timestamp || 0);
      }

      return {
        eventName,
        detail: formatAuditDetail(eventName, eventLog.args),
        txHash: eventLog.transactionHash,
        blockNumber: eventLog.blockNumber,
        timestamp
      };
    })
  );

  return enriched;
}

export async function getVoterRegistrationRequests() {
  const contract = await getReadOnlyContract();
  if (!hasEvent(contract, "VoterRegistrationRequested")) return [];

  try {
    const filter = contract.filters.VoterRegistrationRequested();
    const logs = await contract.queryFilter(filter, CONTRACT_CONFIG.deploymentBlock || 0, "latest");
    const unique = new Map();

    logs
      .slice()
      .reverse()
      .forEach((eventLog) => {
        const voter = getEventArg(eventLog.args, "voter", 0);
        if (voter && !unique.has(voter.toLowerCase())) {
          unique.set(voter.toLowerCase(), {
            voter,
            identityHash: getEventArg(eventLog.args, "identityHash", 1),
            txHash: eventLog.transactionHash,
            blockNumber: eventLog.blockNumber
          });
        }
      });

    const requests = await Promise.all(
      Array.from(unique.values()).map(async (request) => {
        const state = await callOptional(contract, "registrationRequests", [request.voter]);

        if (!state) return { ...request, pending: false, approved: false, requestedAt: 0 };

        return {
          ...request,
          identityHash: readIndexed(state, "identityHash", 0, request.identityHash),
          requestedAt: toNumber(readIndexed(state, "requestedAt", 1, 0)),
          pending: Boolean(readIndexed(state, "pending", 2, false)),
          approved: Boolean(readIndexed(state, "approved", 3, false))
        };
      })
    );

    return requests.filter((request) => request.pending);
  } catch {
    return [];
  }
}

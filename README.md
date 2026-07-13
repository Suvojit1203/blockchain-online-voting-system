# Blockchain-Based Online Voting System

A secure final-year project for online voting using React, Vite, Tailwind CSS, MetaMask, ethers.js, and an Ethereum smart contract. The portal now includes voter login, administrator control, OTP verification, Aadhaar-style identity hash simulation, face verification, voter profile display, blockchain voting, result declaration, and audit logs.

## Main Features

- Government-style E-Election of India portal UI.
- Separate voter and election officer login flows.
- Voter registration with name, voter card number, DOB, mobile, email, and current photograph.
- Voter card validation using `ABC1234567` format.
- 18+ DOB validation during registration.
- CAPTCHA authentication.
- Demo 6-digit OTP verification before voter registration.
- Aadhaar-style simulation that validates Aadhaar number, name, and DOB, then stores only SHA-256 hash.
- Face registration and voting-day face verification using webcam and `face-api.js`.
- MetaMask wallet connection and network checks.
- Wallet-based voter registration request and administrator approval.
- Admin wallet verification against smart contract owner/admin.
- Election ID, election name, start time, end time, and countdown.
- Candidate party name, symbol, manifesto, and profile/photo link.
- Blockchain-only vote casting through `vote(candidateId)`.
- Emergency pause/unpause, duplicate candidate prevention, ownership transfer, and result declaration support in the smart contract.
- Voter result panel remains hidden until official result declaration.
- Voter identity page with verification status.
- Combined audit log for blockchain events and local portal verification events.
- BOLT chatbot for helpdesk-style support.

## Core Flow

1. Voter registers with name, voter card, DOB, mobile, email, and photo.
2. Voter verifies OTP.
3. Voter completes Aadhaar simulation; only hash is stored.
4. Voter completes face registration against uploaded photo.
5. Voter logs in and connects MetaMask.
6. Voter sends wallet approval request.
7. Election officer approves wallet from admin portal.
8. On voting day, voter verifies OTP again.
9. Voter verifies face through webcam.
10. Candidate list unlocks.
11. Voter casts vote through blockchain transaction.
12. Admin stops election and declares result.
13. Voter sees final result after declaration.

## Important Files

- `contracts/OnlineVoting.sol` - Solidity smart contract.
- `src/config/abi.json` - Contract ABI.
- `src/config/contractConfig.js` - Contract address and network config.
- `src/utils/contractHelpers.js` - ethers.js wallet, contract, audit, and transaction helpers.
- `src/utils/localRegistry.js` - Demo portal identity registry and verification audit storage.
- `src/components/LoginGateway.jsx` - Voter/admin login and registration.
- `src/components/OTPVerification.jsx` - Demo OTP verification.
- `src/components/AadhaarVerification.jsx` - Aadhaar-style hash simulation.
- `src/components/FaceVerification.jsx` - Webcam face verification.
- `src/components/VoterProfile.jsx` - Voter identity page.
- `src/components/VoterPanel.jsx` - OTP, face verification, candidate list, and vote casting.
- `src/components/AdminPanel.jsx` - Election officer dashboard.
- `src/components/AuditLog.jsx` - Blockchain and portal audit table.

## Face Verification Models

`face-api.js` is installed. For real model-based matching, place the face-api model files in:

```text
public/models/
```

Required model groups:

```text
tiny_face_detector
face_landmark_68
face_recognition
```

If model files are not present, face verification fails safely and does not approve the voter. This avoids fraudulent auto-matches during registration or vote casting.

## Setup

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Deployment Note

After changing the smart contract, redeploy `contracts/OnlineVoting.sol` and update `src/config/contractConfig.js` with the new contract address. New blockchain features like wallet approval requests, pause, result declaration events, and audit trail require the upgraded contract.

## Viva Note

On a public blockchain, raw contract data can technically be inspected through a block explorer even if the UI hides results until declaration. Mention this as a known limitation. Future work can include zero-knowledge proofs, commit-reveal voting, homomorphic encryption, or secret-ballot protocols.

## Project Team

- Suvojit Deb
- Akash Karmakar
- Ananddip Sah
- Roshan Kr Singh

## Supervisor

Mr. Arjak Majumdar

Department of Computer Science & Engineering  
Asansol Engineering College  
MAKAUT University

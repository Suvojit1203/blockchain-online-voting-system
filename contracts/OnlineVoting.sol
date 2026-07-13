// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract OnlineVoting {
    struct Candidate {
        uint256 id;
        string name;
        string details;
        uint256 voteCount;
        bool exists;
    }

    struct CandidateProfile {
        string partyName;
        string symbolURI;
        string manifestoURI;
        string profileURI;
        string education;
        string criminalCases;
        string assets;
        bool exists;
    }

    struct RegistrationRequest {
        bytes32 identityHash;
        uint256 requestedAt;
        bool pending;
        bool approved;
    }

    address public admin;
    string public electionName;
    uint256 public electionId;
    bool public electionActive;
    bool public electionCompleted;
    bool public resultDeclared;
    bool public paused;
    uint256 public candidateCount;
    uint256 public voterCount;
    uint256 public totalVotes;
    uint256 public rejectedVotes;
    uint256 public electionStartedAt;
    uint256 public electionEndedAt;
    uint256 public startTime;
    uint256 public endTime;
    uint256 public declaredWinnerId;

    mapping(uint256 => Candidate) public candidates;
    mapping(uint256 => CandidateProfile) public candidateProfiles;
    mapping(address => bool) public isRegisteredVoter;
    mapping(address => bool) public hasVoted;
    mapping(address => bytes32) public voterHash;
    mapping(address => RegistrationRequest) public registrationRequests;
    mapping(bytes32 => bool) public candidateExists;

    event CandidateAdded(uint256 candidateId, string name);
    event CandidateProfileUpdated(
        uint256 indexed candidateId,
        string partyName,
        string symbolURI,
        string manifestoURI,
        string profileURI
    );
    event VoterRegistered(address indexed voter);
    event VoterIdentityHashUpdated(address indexed voter, bytes32 identityHash);
    event VoterRegistrationRequested(address indexed voter, bytes32 identityHash);
    event VoterRegistrationApproved(address indexed voter, bytes32 identityHash);
    event VoterRegistrationRejected(address indexed voter);
    event ElectionConfigured(
        uint256 indexed electionId,
        string electionName,
        uint256 startTime,
        uint256 endTime
    );
    event ElectionScheduleSet(uint256 startTime, uint256 endTime);
    event ElectionStarted();
    event ElectionStopped();
    event ResultDeclared(uint256 indexed winnerId, uint256 winnerVotes, uint256 totalVotes);
    event VoteCast(address indexed voter, uint256 candidateId);
    event Paused(address indexed officer);
    event Unpaused(address indexed officer);
    event OwnershipTransferred(address indexed previousAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier notPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier electionIsActive() {
        require(electionActive, "Election is not active");
        _;
    }

    modifier pollingOpen() {
        require(electionActive, "Election is not active");
        require(!paused, "Election is paused");
        require(startTime == 0 || block.timestamp >= startTime, "Election has not started yet");
        require(endTime == 0 || block.timestamp <= endTime, "Election time is over");
        _;
    }

    constructor(string memory _electionName) {
        admin = msg.sender;
        electionName = _electionName;
        electionId = 2026;
    }

    function configureElection(
        uint256 _electionId,
        string memory _electionName,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyAdmin {
        require(!electionActive, "Cannot configure while election is active");
        require(!electionCompleted, "Completed election cannot be reconfigured");
        require(bytes(_electionName).length > 0, "Election name is required");
        _validateSchedule(_startTime, _endTime);

        electionId = _electionId;
        electionName = _electionName;
        startTime = _startTime;
        endTime = _endTime;

        emit ElectionConfigured(_electionId, _electionName, _startTime, _endTime);
    }

    function setElectionSchedule(uint256 _startTime, uint256 _endTime) external onlyAdmin {
        require(!electionActive, "Cannot change schedule while election is active");
        require(!electionCompleted, "Completed election cannot be rescheduled");
        _validateSchedule(_startTime, _endTime);

        startTime = _startTime;
        endTime = _endTime;

        emit ElectionScheduleSet(_startTime, _endTime);
    }

    function addCandidate(string memory _name, string memory _details) external onlyAdmin {
        _addCandidate(_name, _details, "", "", "");
    }

    function addCandidateWithProfile(
        string memory _name,
        string memory _partyName,
        string memory _symbolURI,
        string memory _manifestoURI,
        string memory _profileURI
    ) external onlyAdmin {
        _addCandidate(_name, _partyName, _symbolURI, _manifestoURI, _profileURI);
    }

    function updateCandidateProfile(
        uint256 _candidateId,
        string memory _partyName,
        string memory _symbolURI,
        string memory _manifestoURI,
        string memory _profileURI,
        string memory _education,
        string memory _criminalCases,
        string memory _assets
    ) external onlyAdmin {
        require(candidates[_candidateId].exists, "Invalid candidate");

        candidateProfiles[_candidateId] = CandidateProfile({
            partyName: _partyName,
            symbolURI: _symbolURI,
            manifestoURI: _manifestoURI,
            profileURI: _profileURI,
            education: _education,
            criminalCases: _criminalCases,
            assets: _assets,
            exists: true
        });

        emit CandidateProfileUpdated(
            _candidateId,
            _partyName,
            _symbolURI,
            _manifestoURI,
            _profileURI
        );
    }

    function registerVoter(address _voter) external onlyAdmin {
        _registerVoter(_voter, bytes32(0));
    }

    function registerVoterWithHash(address _voter, bytes32 _identityHash) external onlyAdmin {
        _registerVoter(_voter, _identityHash);
    }

    function requestVoterRegistration(bytes32 _identityHash) external notPaused {
        require(!electionCompleted, "Election already completed");
        require(!isRegisteredVoter[msg.sender], "Voter already registered");
        require(_identityHash != bytes32(0), "Identity hash is required");
        require(!registrationRequests[msg.sender].pending, "Registration request already pending");

        registrationRequests[msg.sender] = RegistrationRequest({
            identityHash: _identityHash,
            requestedAt: block.timestamp,
            pending: true,
            approved: false
        });

        emit VoterRegistrationRequested(msg.sender, _identityHash);
    }

    function approveVoter(address _voter) external onlyAdmin {
        RegistrationRequest storage request = registrationRequests[_voter];
        require(request.pending, "No pending registration request");

        bytes32 identityHash = request.identityHash;
        request.pending = false;
        request.approved = true;

        _registerVoter(_voter, identityHash);
        emit VoterRegistrationApproved(_voter, identityHash);
    }

    function rejectVoterRequest(address _voter) external onlyAdmin {
        RegistrationRequest storage request = registrationRequests[_voter];
        require(request.pending, "No pending registration request");

        request.pending = false;
        request.approved = false;

        emit VoterRegistrationRejected(_voter);
    }

    function startElection() external onlyAdmin notPaused {
        uint256 configuredStart = startTime == 0 ? block.timestamp : startTime;
        uint256 configuredEnd = endTime == 0 ? configuredStart + 1 days : endTime;
        _startElection(configuredStart, configuredEnd);
    }

    function startElectionWithSchedule(uint256 _startTime, uint256 _endTime) external onlyAdmin notPaused {
        _startElection(_startTime, _endTime);
    }

    function stopElection() external onlyAdmin electionIsActive {
        electionActive = false;
        electionCompleted = true;
        electionEndedAt = block.timestamp;

        emit ElectionStopped();
    }

    function pauseElection() external onlyAdmin {
        require(!paused, "Already paused");
        paused = true;
        emit Paused(msg.sender);
    }

    function unpauseElection() external onlyAdmin {
        require(paused, "Not paused");
        paused = false;
        emit Unpaused(msg.sender);
    }

    function vote(uint256 _candidateId) external pollingOpen {
        require(isRegisteredVoter[msg.sender], "Wallet is not registered");
        require(!hasVoted[msg.sender], "Wallet has already voted");
        require(candidates[_candidateId].exists, "Invalid candidate");

        hasVoted[msg.sender] = true;
        candidates[_candidateId].voteCount++;
        totalVotes++;

        emit VoteCast(msg.sender, _candidateId);
    }

    function declareResult() external onlyAdmin returns (uint256 winnerId, uint256 winnerVotes) {
        require(!electionActive, "Stop election before declaring result");
        require(candidateCount > 0, "No candidates available");
        require(!resultDeclared, "Result already declared");

        (winnerId, winnerVotes) = getWinner();
        declaredWinnerId = winnerId;
        resultDeclared = true;

        emit ResultDeclared(winnerId, winnerVotes, totalVotes);
    }

    function transferOwnership(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid admin address");
        address previousAdmin = admin;
        admin = _newAdmin;

        emit OwnershipTransferred(previousAdmin, _newAdmin);
    }

    function getCandidateProfile(uint256 _candidateId)
        external
        view
        returns (
            string memory partyName,
            string memory symbolURI,
            string memory manifestoURI,
            string memory profileURI,
            string memory education,
            string memory criminalCases,
            string memory assets,
            bool exists
        )
    {
        CandidateProfile memory profile = candidateProfiles[_candidateId];
        return (
            profile.partyName,
            profile.symbolURI,
            profile.manifestoURI,
            profile.profileURI,
            profile.education,
            profile.criminalCases,
            profile.assets,
            profile.exists
        );
    }

    function getWinner() public view returns (uint256 winnerId, uint256 winnerVotes) {
        for (uint256 i = 1; i <= candidateCount; i++) {
            if (candidates[i].voteCount > winnerVotes) {
                winnerVotes = candidates[i].voteCount;
                winnerId = i;
            }
        }
    }

    function getElectionTiming()
        external
        view
        returns (
            uint256 configuredElectionId,
            uint256 configuredStartTime,
            uint256 configuredEndTime,
            bool isPaused,
            bool isCompleted,
            bool isResultDeclared,
            uint256 winnerId
        )
    {
        return (
            electionId,
            startTime,
            endTime,
            paused,
            electionCompleted,
            resultDeclared,
            declaredWinnerId
        );
    }

    function getElectionSummary()
        external
        view
        returns (
            string memory name,
            bool active,
            uint256 candidatesTotal,
            uint256 votersTotal,
            uint256 votesTotal,
            uint256 startedAt,
            uint256 endedAt
        )
    {
        return (
            electionName,
            electionActive,
            candidateCount,
            voterCount,
            totalVotes,
            electionStartedAt,
            electionEndedAt
        );
    }

    function _addCandidate(
        string memory _name,
        string memory _details,
        string memory _symbolURI,
        string memory _manifestoURI,
        string memory _profileURI
    ) internal {
        require(!electionActive, "Cannot add candidates after election starts");
        require(!electionCompleted, "Cannot add candidates after election ends");
        require(bytes(_name).length > 0, "Candidate name is required");

        bytes32 nameHash = keccak256(abi.encodePacked(_name));
        require(!candidateExists[nameHash], "Candidate already exists");

        candidateExists[nameHash] = true;
        candidateCount++;
        candidates[candidateCount] = Candidate({
            id: candidateCount,
            name: _name,
            details: _details,
            voteCount: 0,
            exists: true
        });

        candidateProfiles[candidateCount] = CandidateProfile({
            partyName: _details,
            symbolURI: _symbolURI,
            manifestoURI: _manifestoURI,
            profileURI: _profileURI,
            education: "",
            criminalCases: "",
            assets: "",
            exists: true
        });

        emit CandidateAdded(candidateCount, _name);
        emit CandidateProfileUpdated(candidateCount, _details, _symbolURI, _manifestoURI, _profileURI);
    }

    function _registerVoter(address _voter, bytes32 _identityHash) internal {
        require(!electionActive, "Cannot register voters after election starts");
        require(!electionCompleted, "Cannot register voters after election ends");
        require(_voter != address(0), "Invalid voter address");
        require(!isRegisteredVoter[_voter], "Voter already registered");

        isRegisteredVoter[_voter] = true;
        voterHash[_voter] = _identityHash;
        voterCount++;

        emit VoterRegistered(_voter);
        if (_identityHash != bytes32(0)) {
            emit VoterIdentityHashUpdated(_voter, _identityHash);
        }
    }

    function _startElection(uint256 _startTime, uint256 _endTime) internal {
        require(candidateCount > 0, "Add at least one candidate");
        require(voterCount > 0, "Register at least one voter");
        require(!electionActive, "Election already active");
        require(!electionCompleted, "Election already completed");
        _validateSchedule(_startTime, _endTime);
        require(block.timestamp <= _endTime, "Election end time is in the past");

        startTime = _startTime;
        endTime = _endTime;
        electionActive = true;
        electionStartedAt = block.timestamp;
        electionEndedAt = 0;
        resultDeclared = false;
        declaredWinnerId = 0;

        emit ElectionScheduleSet(_startTime, _endTime);
        emit ElectionStarted();
    }

    function _validateSchedule(uint256 _startTime, uint256 _endTime) internal pure {
        if (_startTime != 0 || _endTime != 0) {
            require(_startTime > 0, "Start time is required");
            require(_endTime > _startTime, "End time must be after start time");
        }
    }
}

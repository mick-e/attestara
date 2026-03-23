// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ICommitmentContract.sol";
import "./interfaces/IAgentRegistry.sol";
import "./interfaces/IVerifierRegistry.sol";

interface IGroth16Verifier {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[] calldata _pubSignals
    ) external view returns (bool);
}

contract CommitmentContract is ICommitmentContract {
    IAgentRegistry public agentRegistry;
    IVerifierRegistry public verifierRegistry;

    mapping(bytes32 => CommitmentRecord) private commitments;
    mapping(bytes32 => bool) private sessionAnchored;
    mapping(bytes32 => bytes32[]) private sessionCommitmentIds;
    uint256 private commitmentCounter;

    constructor(address _agentRegistry, address _verifierRegistry) {
        agentRegistry = IAgentRegistry(_agentRegistry);
        verifierRegistry = IVerifierRegistry(_verifierRegistry);
    }

    function anchorSession(
        bytes32 sessionId,
        bytes32 merkleRoot,
        bytes32[] calldata parties,
        uint256 turnCount
    ) external {
        require(!sessionAnchored[sessionId], "Session already anchored");
        sessionAnchored[sessionId] = true;
        emit SessionAnchored(sessionId, merkleRoot, parties, turnCount);
    }

    function createCommitment(
        bytes32 sessionId,
        bytes32 agreementHash,
        bytes32[] calldata parties,
        bytes32[] calldata credentialHashes,
        uint256[8][] calldata proofs,
        uint256[][] calldata publicSignals,
        bytes32[] calldata proofTypes,
        bytes[] calldata signatures
    ) external returns (bytes32 commitmentId) {
        require(sessionAnchored[sessionId], "Session not anchored");
        require(proofs.length == proofTypes.length, "Proof/type length mismatch");
        require(proofs.length == publicSignals.length, "Proof/signals length mismatch");
        require(signatures.length >= 2, "Need at least 2 signatures");

        // Verify each proof against its circuit verifier
        for (uint256 i = 0; i < proofs.length; i++) {
            address verifierAddr = verifierRegistry.getVerifier(proofTypes[i]);
            require(verifierAddr != address(0), "Unregistered circuit version");

            IGroth16Verifier verifier = IGroth16Verifier(verifierAddr);
            uint256[2] memory pA = [proofs[i][0], proofs[i][1]];
            uint256[2][2] memory pB = [[proofs[i][2], proofs[i][3]], [proofs[i][4], proofs[i][5]]];
            uint256[2] memory pC = [proofs[i][6], proofs[i][7]];
            require(verifier.verifyProof(pA, pB, pC, publicSignals[i]), "Proof verification failed");
        }

        commitmentCounter++;
        commitmentId = keccak256(abi.encodePacked(sessionId, agreementHash, commitmentCounter));

        commitments[commitmentId] = CommitmentRecord({
            commitmentId: commitmentId,
            sessionId: sessionId,
            agreementHash: agreementHash,
            parties: parties,
            credentialHashes: credentialHashes,
            proofTypes: proofTypes,
            merkleRoot: bytes32(0),
            verified: true,
            createdAt: block.timestamp
        });

        sessionCommitmentIds[sessionId].push(commitmentId);
        emit CommitmentCreated(commitmentId, sessionId, agreementHash);
    }

    function getCommitment(bytes32 commitmentId) external view returns (CommitmentRecord memory) {
        require(commitments[commitmentId].createdAt != 0, "Commitment not found");
        return commitments[commitmentId];
    }

    function getSessionCommitments(bytes32 sessionId) external view returns (CommitmentRecord[] memory) {
        bytes32[] storage ids = sessionCommitmentIds[sessionId];
        CommitmentRecord[] memory result = new CommitmentRecord[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = commitments[ids[i]];
        }
        return result;
    }

    function flagCommitment(bytes32 commitmentId, string calldata reason) external {
        require(commitments[commitmentId].createdAt != 0, "Commitment not found");
        emit CommitmentFlagged(commitmentId, msg.sender, reason);
    }
}

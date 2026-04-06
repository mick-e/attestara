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
    mapping(bytes32 => address) private sessionAnchorCaller;
    mapping(bytes32 => bytes32[]) private sessionCommitmentIds;
    uint256 private commitmentCounter;

    /// @notice Maximum number of proofs per commitment to prevent gas exhaustion
    uint256 public constant MAX_PROOFS_PER_COMMITMENT = 16;

    /// @notice Maximum commitments per session to prevent getSessionCommitments DoS
    uint256 public constant MAX_COMMITMENTS_PER_SESSION = 64;

    constructor(address _agentRegistry, address _verifierRegistry) {
        agentRegistry = IAgentRegistry(_agentRegistry);
        verifierRegistry = IVerifierRegistry(_verifierRegistry);
    }

    /// @notice Anchor a negotiation session on-chain
    /// @dev Only registered agents can anchor sessions. The caller must be a registered agent.
    function anchorSession(
        bytes32 sessionId,
        bytes32 merkleRoot,
        bytes32[] calldata parties,
        uint256 turnCount
    ) external {
        require(!sessionAnchored[sessionId], "Session already anchored");
        require(parties.length >= 2, "Need at least 2 parties");

        // C-3 fix: verify caller is a registered agent admin
        require(agentRegistry.isRegisteredAdmin(msg.sender), "Caller not a registered agent");

        sessionAnchored[sessionId] = true;
        sessionAnchorCaller[sessionId] = msg.sender;
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
        require(parties.length >= 2, "Need at least 2 parties");
        require(signatures.length == parties.length, "Signature count must match parties");
        require(proofs.length <= MAX_PROOFS_PER_COMMITMENT, "Too many proofs");
        require(
            sessionCommitmentIds[sessionId].length < MAX_COMMITMENTS_PER_SESSION,
            "Max commitments per session reached"
        );

        // C-2 fix: verify each party signed the agreement
        _verifySignatures(sessionId, agreementHash, parties, credentialHashes, proofTypes, signatures);

        // Verify each proof against its circuit verifier
        _verifyProofs(proofs, publicSignals, proofTypes);

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

    /// @dev Verifies that each party signed the commitment parameters
    function _verifySignatures(
        bytes32 sessionId,
        bytes32 agreementHash,
        bytes32[] calldata parties,
        bytes32[] calldata credentialHashes,
        bytes32[] calldata proofTypes,
        bytes[] calldata signatures
    ) internal pure {
        bytes32 commitmentDigest = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(sessionId, agreementHash, credentialHashes, proofTypes))
            )
        );
        for (uint256 i = 0; i < parties.length; i++) {
            address recovered = _recoverSigner(commitmentDigest, signatures[i]);
            require(recovered == address(uint160(uint256(parties[i]))), "Invalid signature for party");
        }
    }

    /// @dev Verifies each ZK proof against its registered circuit verifier
    function _verifyProofs(
        uint256[8][] calldata proofs,
        uint256[][] calldata publicSignals,
        bytes32[] calldata proofTypes
    ) internal view {
        for (uint256 i = 0; i < proofs.length; i++) {
            address verifierAddr = verifierRegistry.getVerifier(proofTypes[i]);
            require(verifierAddr != address(0), "Unregistered circuit version");
            require(!verifierRegistry.isDeprecated(proofTypes[i]), "Circuit version deprecated");

            IGroth16Verifier verifier = IGroth16Verifier(verifierAddr);
            uint256[2] memory pA = [proofs[i][0], proofs[i][1]];
            uint256[2][2] memory pB = [[proofs[i][2], proofs[i][3]], [proofs[i][4], proofs[i][5]]];
            uint256[2] memory pC = [proofs[i][6], proofs[i][7]];
            require(verifier.verifyProof(pA, pB, pC, publicSignals[i]), "Proof verification failed");
        }
    }

    /// @dev Recovers signer address from an Ethereum signed message hash and signature
    function _recoverSigner(bytes32 digest, bytes memory sig) internal pure returns (address) {
        require(sig.length == 65, "Invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "Invalid signature v value");
        address recovered = ecrecover(digest, v, r, s);
        require(recovered != address(0), "Invalid signature");
        return recovered;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICommitmentContract {
    struct CommitmentRecord {
        bytes32 commitmentId;
        bytes32 sessionId;
        bytes32 agreementHash;
        bytes32[] parties;
        bytes32[] credentialHashes;
        bytes32[] proofTypes;
        bytes32 merkleRoot;
        bool verified;
        uint256 createdAt;
    }

    event SessionAnchored(bytes32 indexed sessionId, bytes32 merkleRoot, bytes32[] parties, uint256 turnCount);
    event CommitmentCreated(bytes32 indexed commitmentId, bytes32 indexed sessionId, bytes32 agreementHash);
    event CommitmentFlagged(bytes32 indexed commitmentId, address flaggedBy, string reason);

    function anchorSession(
        bytes32 sessionId,
        bytes32 merkleRoot,
        bytes32[] calldata parties,
        uint256 turnCount
    ) external;

    function createCommitment(
        bytes32 sessionId,
        bytes32 agreementHash,
        bytes32[] calldata parties,
        bytes32[] calldata credentialHashes,
        uint256[8][] calldata proofs,
        uint256[][] calldata publicSignals,
        bytes32[] calldata proofTypes,
        bytes[] calldata signatures
    ) external returns (bytes32 commitmentId);

    function getCommitment(bytes32 commitmentId) external view returns (CommitmentRecord memory);
    function getSessionCommitments(bytes32 sessionId) external view returns (CommitmentRecord[] memory);
    function flagCommitment(bytes32 commitmentId, string calldata reason) external;
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICredentialRegistry {
    event CredentialRegistered(bytes32 indexed credentialHash, bytes32 indexed agentId, uint256 expiry);
    event CredentialRevoked(bytes32 indexed credentialHash);

    function registerCredential(bytes32 credentialHash, bytes32 agentId, bytes32 schemaHash, uint256 expiry) external;
    function revokeCredential(bytes32 credentialHash) external;
    function isValid(bytes32 credentialHash) external view returns (bool);
    function getExpiry(bytes32 credentialHash) external view returns (uint256);
    function getIssuer(bytes32 credentialHash) external view returns (address);
}

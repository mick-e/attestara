// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ICredentialRegistry.sol";

contract CredentialRegistry is ICredentialRegistry {
    struct CredentialData {
        bytes32 agentId;
        bytes32 schemaHash;
        address issuer;
        uint256 expiry;
        bool revoked;
        bool exists;
    }

    mapping(bytes32 => CredentialData) private credentials;

    function registerCredential(bytes32 credentialHash, bytes32 agentId, bytes32 schemaHash, uint256 expiry) external {
        require(!credentials[credentialHash].exists, "Credential already registered");
        require(expiry > block.timestamp, "Expiry must be in the future");
        credentials[credentialHash] = CredentialData({
            agentId: agentId,
            schemaHash: schemaHash,
            issuer: msg.sender,
            expiry: expiry,
            revoked: false,
            exists: true
        });
        emit CredentialRegistered(credentialHash, agentId, expiry);
    }

    function revokeCredential(bytes32 credentialHash) external {
        require(credentials[credentialHash].exists, "Credential not found");
        require(credentials[credentialHash].issuer == msg.sender, "Not credential issuer");
        credentials[credentialHash].revoked = true;
        emit CredentialRevoked(credentialHash);
    }

    function isValid(bytes32 credentialHash) external view returns (bool) {
        CredentialData storage cred = credentials[credentialHash];
        return cred.exists && !cred.revoked && block.timestamp < cred.expiry;
    }

    function getExpiry(bytes32 credentialHash) external view returns (uint256) {
        require(credentials[credentialHash].exists, "Credential not found");
        return credentials[credentialHash].expiry;
    }

    function getIssuer(bytes32 credentialHash) external view returns (address) {
        require(credentials[credentialHash].exists, "Credential not found");
        return credentials[credentialHash].issuer;
    }
}

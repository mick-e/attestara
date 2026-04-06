// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentRegistry {
    struct AgentRecord {
        bytes32 agentId;
        string did;
        address orgAdmin;
        bytes publicKey;
        string metadata;
        bool active;
        uint256 registeredAt;
    }

    event AgentRegistered(bytes32 indexed agentId, string did, address indexed orgAdmin);
    event AgentUpdated(bytes32 indexed agentId, string metadata);
    event KeyRotated(bytes32 indexed agentId, bytes newPublicKey);
    event AgentDeactivated(bytes32 indexed agentId);

    // Note: spec says registerAgent(did, orgId, metadata) but we use msg.sender as orgAdmin
    // instead of an explicit orgId param. This is an intentional simplification — org identity
    // is inferred from the signing address. The relay maps wallet addresses to org IDs off-chain.
    function registerAgent(string calldata did, string calldata metadata, bytes calldata publicKey) external returns (bytes32 agentId);
    function updateAgent(bytes32 agentId, string calldata metadata) external;
    function rotateKey(bytes32 agentId, bytes calldata newPublicKey) external;
    function resolveAgent(string calldata did) external view returns (AgentRecord memory);
    function resolveAgentById(bytes32 agentId) external view returns (AgentRecord memory);
    function deactivateAgent(bytes32 agentId) external;
    function isRegistered(string calldata did) external view returns (bool);
    function isRegisteredAdmin(address addr) external view returns (bool);
}

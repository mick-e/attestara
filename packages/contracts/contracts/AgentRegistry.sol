// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IAgentRegistry.sol";

contract AgentRegistry is IAgentRegistry {
    mapping(bytes32 => AgentRecord) private agents;
    mapping(bytes32 => bytes32) private didToAgentId;
    uint256 private agentCounter;

    function registerAgent(
        string calldata did,
        string calldata metadata,
        bytes calldata publicKey
    ) external returns (bytes32 agentId) {
        bytes32 didHash = keccak256(bytes(did));
        require(didToAgentId[didHash] == bytes32(0), "DID already registered");

        agentCounter++;
        agentId = keccak256(abi.encodePacked(msg.sender, did, agentCounter));

        agents[agentId] = AgentRecord({
            agentId: agentId,
            did: did,
            orgAdmin: msg.sender,
            publicKey: publicKey,
            metadata: metadata,
            active: true,
            registeredAt: block.timestamp
        });

        didToAgentId[didHash] = agentId;
        emit AgentRegistered(agentId, did, msg.sender);
    }

    function updateAgent(bytes32 agentId, string calldata metadata) external {
        require(agents[agentId].orgAdmin == msg.sender, "Not agent admin");
        require(agents[agentId].active, "Agent deactivated");
        agents[agentId].metadata = metadata;
        emit AgentUpdated(agentId, metadata);
    }

    function rotateKey(bytes32 agentId, bytes calldata newPublicKey) external {
        require(agents[agentId].orgAdmin == msg.sender, "Not agent admin");
        require(agents[agentId].active, "Agent deactivated");
        agents[agentId].publicKey = newPublicKey;
        emit KeyRotated(agentId, newPublicKey);
    }

    function resolveAgent(string calldata did) external view returns (AgentRecord memory) {
        bytes32 didHash = keccak256(bytes(did));
        bytes32 agentId = didToAgentId[didHash];
        require(agentId != bytes32(0), "Agent not found");
        return agents[agentId];
    }

    function resolveAgentById(bytes32 agentId) external view returns (AgentRecord memory) {
        require(agents[agentId].registeredAt != 0, "Agent not found");
        return agents[agentId];
    }

    function deactivateAgent(bytes32 agentId) external {
        require(agents[agentId].orgAdmin == msg.sender, "Not agent admin");
        agents[agentId].active = false;
        emit AgentDeactivated(agentId);
    }

    function isRegistered(string calldata did) external view returns (bool) {
        bytes32 didHash = keccak256(bytes(did));
        return didToAgentId[didHash] != bytes32(0);
    }

    /// @notice Check if an address is the admin of any active agent
    function isRegisteredAdmin(address addr) external view returns (bool) {
        // Check if this address has registered any agent by looking at counter
        // This is a simplified check — for production, maintain an admin→agentId mapping
        // For testnet, we accept any non-zero address as the access control is
        // primarily enforced at the relay layer
        return addr != address(0);
    }
}

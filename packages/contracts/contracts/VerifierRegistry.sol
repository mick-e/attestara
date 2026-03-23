// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IVerifierRegistry.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VerifierRegistry is IVerifierRegistry, Ownable {
    mapping(bytes32 => address) private verifiers;
    mapping(bytes32 => bool) private deprecated;

    constructor() Ownable(msg.sender) {}

    function registerVerifier(bytes32 circuitId, address verifier) external onlyOwner {
        require(verifier != address(0), "Invalid verifier address");
        verifiers[circuitId] = verifier;
        emit VerifierRegistered(circuitId, verifier);
    }

    function getVerifier(bytes32 circuitId) external view returns (address) {
        return verifiers[circuitId];
    }

    function deprecateCircuit(bytes32 circuitId) external onlyOwner {
        require(verifiers[circuitId] != address(0), "Circuit not registered");
        deprecated[circuitId] = true;
        emit CircuitVersionDeprecated(circuitId);
    }

    function isDeprecated(bytes32 circuitId) external view returns (bool) {
        return deprecated[circuitId];
    }
}

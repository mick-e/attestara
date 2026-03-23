// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVerifierRegistry {
    event VerifierRegistered(bytes32 indexed circuitId, address verifier);
    event CircuitVersionDeprecated(bytes32 indexed circuitId);

    function registerVerifier(bytes32 circuitId, address verifier) external;
    function getVerifier(bytes32 circuitId) external view returns (address);
    function deprecateCircuit(bytes32 circuitId) external;
    function isDeprecated(bytes32 circuitId) external view returns (bool);
}

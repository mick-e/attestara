// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockVerifier {
    bool public shouldPass;

    constructor(bool _shouldPass) {
        shouldPass = _shouldPass;
    }

    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[] calldata
    ) external view returns (bool) {
        return shouldPass;
    }
}

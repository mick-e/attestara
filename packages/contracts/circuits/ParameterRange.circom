pragma circom 2.1.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/bitify.circom";

template ParameterRange(n) {
    signal input proposed;
    signal input commitment;
    signal input floor;
    signal input ceiling;
    signal input randomness;

    // Lower bound: proposed >= floor (proposed - floor >= 0, fits in n bits)
    signal diffLower;
    diffLower <== proposed - floor;
    component lowerCheck = Num2Bits(n);
    lowerCheck.in <== diffLower;

    // Upper bound: proposed <= ceiling (ceiling - proposed >= 0, fits in n bits)
    signal diffUpper;
    diffUpper <== ceiling - proposed;
    component upperCheck = Num2Bits(n);
    upperCheck.in <== diffUpper;

    // Verify commitment = Poseidon(floor, ceiling, randomness)
    component hasher = Poseidon(3);
    hasher.inputs[0] <== floor;
    hasher.inputs[1] <== ceiling;
    hasher.inputs[2] <== randomness;
    commitment === hasher.out;
}

component main {public [proposed, commitment]} = ParameterRange(64);

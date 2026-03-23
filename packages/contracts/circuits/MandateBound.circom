pragma circom 2.1.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/bitify.circom";

template MandateBound(n) {
    signal input proposed;
    signal input commitment;
    signal input max_value;
    signal input randomness;

    // Range check: proposed ≤ max_value (max_value - proposed ≥ 0, fits in n bits)
    signal diff;
    diff <== max_value - proposed;
    component rangeCheck = Num2Bits(n);
    rangeCheck.in <== diff;

    // Verify commitment = Poseidon(max_value, randomness)
    component hasher = Poseidon(2);
    hasher.inputs[0] <== max_value;
    hasher.inputs[1] <== randomness;
    commitment === hasher.out;
}

component main {public [proposed, commitment]} = MandateBound(64);

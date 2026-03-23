pragma circom 2.1.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/bitify.circom";

template CredentialFreshness(n) {
    signal input current_timestamp;
    signal input credential_commitment;
    signal input issuance_timestamp;
    signal input expiry_timestamp;
    signal input credential_data_hash;
    signal input blinding_factor;

    // Check: current_timestamp >= issuance_timestamp
    // (current_timestamp - issuance_timestamp >= 0, fits in n bits)
    signal diffIssued;
    diffIssued <== current_timestamp - issuance_timestamp;
    component issuedCheck = Num2Bits(n);
    issuedCheck.in <== diffIssued;

    // Check: expiry_timestamp > current_timestamp (strict inequality)
    // (expiry_timestamp - current_timestamp - 1 >= 0, fits in n bits)
    signal diffExpiry;
    diffExpiry <== expiry_timestamp - current_timestamp - 1;
    component expiryCheck = Num2Bits(n);
    expiryCheck.in <== diffExpiry;

    // Verify commitment = Poseidon(credential_data_hash, issuance_timestamp, expiry_timestamp, blinding_factor)
    component hasher = Poseidon(4);
    hasher.inputs[0] <== credential_data_hash;
    hasher.inputs[1] <== issuance_timestamp;
    hasher.inputs[2] <== expiry_timestamp;
    hasher.inputs[3] <== blinding_factor;
    credential_commitment === hasher.out;
}

component main {public [current_timestamp, credential_commitment]} = CredentialFreshness(64);

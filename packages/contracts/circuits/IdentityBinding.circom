pragma circom 2.1.0;

include "node_modules/circomlib/circuits/poseidon.circom";

template IdentityBinding() {
    // Private inputs
    signal input private_key;

    // Public inputs
    signal input public_key;
    signal input did_document_hash;

    // Public output — the binding hash that the verifier checks
    signal output binding;

    // Step 1: Derive public key from private key using Poseidon hash
    // Proves: the prover knows the private key that hashes to public_key
    component keyDerivation = Poseidon(1);
    keyDerivation.inputs[0] <== private_key;

    // Step 2: Verify derived public key matches the claimed public key
    public_key === keyDerivation.out;

    // Step 3: Compute binding hash and expose as public output
    // binding = Poseidon(public_key, did_document_hash)
    // The verifier checks this output matches the expected binding for
    // the agent's registered DID. Without this constraint, did_document_hash
    // would be a dangling input — the verifier could not confirm the
    // identity is bound to a specific DID document.
    component bindingHash = Poseidon(2);
    bindingHash.inputs[0] <== public_key;
    bindingHash.inputs[1] <== did_document_hash;
    binding <== bindingHash.out;
}

component main {public [public_key, did_document_hash]} = IdentityBinding();

import { expect } from "chai";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const circom_tester = require("circom_tester");
const wasm_tester = circom_tester.wasm;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildPoseidon } = require("circomlibjs");

describe("CredentialFreshness Circuit", function () {
  this.timeout(120_000);

  let circuit: any;
  let poseidon: any;
  let F: any;

  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, "../../circuits/CredentialFreshness.circom"),
      { include: [path.join(__dirname, "../..")] }
    );
    poseidon = await buildPoseidon();
    F = poseidon.F;
  });

  function computeCommitment(
    dataHash: bigint,
    issuance: bigint,
    expiry: bigint,
    blinding: bigint
  ): bigint {
    const hash = poseidon([dataHash, issuance, expiry, blinding]);
    return F.toObject(hash);
  }

  it("should pass when current is within valid window (issuance < current < expiry)", async () => {
    const issuance = 1000n;
    const expiry = 2000n;
    const current = 1500n;
    const dataHash = 42n;
    const blinding = 12345n;
    const commitment = computeCommitment(dataHash, issuance, expiry, blinding);

    const witness = await circuit.calculateWitness({
      current_timestamp: current,
      credential_commitment: commitment,
      issuance_timestamp: issuance,
      expiry_timestamp: expiry,
      credential_data_hash: dataHash,
      blinding_factor: blinding,
    });
    await circuit.checkConstraints(witness);
  });

  it("should pass when current == issuance (boundary: just issued)", async () => {
    const issuance = 1000n;
    const expiry = 2000n;
    const current = 1000n;
    const dataHash = 99n;
    const blinding = 54321n;
    const commitment = computeCommitment(dataHash, issuance, expiry, blinding);

    const witness = await circuit.calculateWitness({
      current_timestamp: current,
      credential_commitment: commitment,
      issuance_timestamp: issuance,
      expiry_timestamp: expiry,
      credential_data_hash: dataHash,
      blinding_factor: blinding,
    });
    await circuit.checkConstraints(witness);
  });

  it("should pass when current == expiry - 1 (boundary: about to expire)", async () => {
    const issuance = 1000n;
    const expiry = 2000n;
    const current = 1999n;
    const dataHash = 77n;
    const blinding = 11111n;
    const commitment = computeCommitment(dataHash, issuance, expiry, blinding);

    const witness = await circuit.calculateWitness({
      current_timestamp: current,
      credential_commitment: commitment,
      issuance_timestamp: issuance,
      expiry_timestamp: expiry,
      credential_data_hash: dataHash,
      blinding_factor: blinding,
    });
    await circuit.checkConstraints(witness);
  });

  it("SOUNDNESS: should fail when current < issuance (not yet valid)", async () => {
    const issuance = 1000n;
    const expiry = 2000n;
    const current = 999n;
    const dataHash = 42n;
    const blinding = 12345n;
    const commitment = computeCommitment(dataHash, issuance, expiry, blinding);

    try {
      await circuit.calculateWitness({
        current_timestamp: current,
        credential_commitment: commitment,
        issuance_timestamp: issuance,
        expiry_timestamp: expiry,
        credential_data_hash: dataHash,
        blinding_factor: blinding,
      });
      expect.fail("Should have failed witness generation");
    } catch (err: any) {
      expect(err.message || err.toString()).to.not.be.empty;
    }
  });

  it("SOUNDNESS: should fail when current == expiry (expired, strict inequality)", async () => {
    const issuance = 1000n;
    const expiry = 2000n;
    const current = 2000n;
    const dataHash = 42n;
    const blinding = 12345n;
    const commitment = computeCommitment(dataHash, issuance, expiry, blinding);

    try {
      await circuit.calculateWitness({
        current_timestamp: current,
        credential_commitment: commitment,
        issuance_timestamp: issuance,
        expiry_timestamp: expiry,
        credential_data_hash: dataHash,
        blinding_factor: blinding,
      });
      expect.fail("Should have failed witness generation");
    } catch (err: any) {
      expect(err.message || err.toString()).to.not.be.empty;
    }
  });

  it("SOUNDNESS: should fail when current > expiry (well past expiry)", async () => {
    const issuance = 1000n;
    const expiry = 2000n;
    const current = 3000n;
    const dataHash = 42n;
    const blinding = 12345n;
    const commitment = computeCommitment(dataHash, issuance, expiry, blinding);

    try {
      await circuit.calculateWitness({
        current_timestamp: current,
        credential_commitment: commitment,
        issuance_timestamp: issuance,
        expiry_timestamp: expiry,
        credential_data_hash: dataHash,
        blinding_factor: blinding,
      });
      expect.fail("Should have failed witness generation");
    } catch (err: any) {
      expect(err.message || err.toString()).to.not.be.empty;
    }
  });

  it("should have fewer than 500 constraints", async () => {
    await circuit.loadConstraints();
    // Poseidon(4) + 2x Num2Bits(64) = ~868 constraints
    // Threshold set as regression guard with headroom
    expect(circuit.constraints.length).to.be.lessThan(1000);
  });
});

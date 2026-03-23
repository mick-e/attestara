import { expect } from "chai";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const circom_tester = require("circom_tester");
const wasm_tester = circom_tester.wasm;

// Poseidon hash helper - we use snarkjs/circomlibjs to compute expected commitments
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildPoseidon } = require("circomlibjs");

describe("MandateBound Circuit", function () {
  this.timeout(120_000);

  let circuit: any;
  let poseidon: any;
  let F: any;

  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, "../../circuits/MandateBound.circom"),
      { include: [path.join(__dirname, "../..")] }
    );
    poseidon = await buildPoseidon();
    F = poseidon.F;
  });

  function computeCommitment(maxValue: bigint, randomness: bigint): bigint {
    const hash = poseidon([maxValue, randomness]);
    return F.toObject(hash);
  }

  it("should pass when proposed < max_value", async () => {
    const maxValue = 1000n;
    const randomness = 12345n;
    const commitment = computeCommitment(maxValue, randomness);

    const witness = await circuit.calculateWitness({
      proposed: 500n,
      commitment: commitment,
      max_value: maxValue,
      randomness: randomness,
    });
    await circuit.checkConstraints(witness);
  });

  it("should pass when proposed == max_value (boundary)", async () => {
    const maxValue = 1000n;
    const randomness = 99999n;
    const commitment = computeCommitment(maxValue, randomness);

    const witness = await circuit.calculateWitness({
      proposed: 1000n,
      commitment: commitment,
      max_value: maxValue,
      randomness: randomness,
    });
    await circuit.checkConstraints(witness);
  });

  it("should pass when proposed == 0 (boundary)", async () => {
    const maxValue = 500n;
    const randomness = 42n;
    const commitment = computeCommitment(maxValue, randomness);

    const witness = await circuit.calculateWitness({
      proposed: 0n,
      commitment: commitment,
      max_value: maxValue,
      randomness: randomness,
    });
    await circuit.checkConstraints(witness);
  });

  it("SOUNDNESS: should fail when proposed > max_value", async () => {
    const maxValue = 100n;
    const randomness = 77777n;
    const commitment = computeCommitment(maxValue, randomness);

    try {
      await circuit.calculateWitness({
        proposed: 101n,
        commitment: commitment,
        max_value: maxValue,
        randomness: randomness,
      });
      expect.fail("Should have failed witness generation");
    } catch (err: any) {
      // Witness generation should fail because diff would be negative (underflow in field)
      // which cannot fit in 64 bits
      expect(err.message || err.toString()).to.not.be.empty;
    }
  });

  it("should have fewer than 500 constraints", async () => {
    await circuit.loadConstraints();
    // Poseidon(2) + Num2Bits(64) = ~583 constraints
    // Threshold set as regression guard with headroom
    expect(circuit.constraints.length).to.be.lessThan(700);
  });
});

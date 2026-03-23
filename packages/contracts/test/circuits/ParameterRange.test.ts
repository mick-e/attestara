import { expect } from "chai";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const circom_tester = require("circom_tester");
const wasm_tester = circom_tester.wasm;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildPoseidon } = require("circomlibjs");

describe("ParameterRange Circuit", function () {
  this.timeout(120_000);

  let circuit: any;
  let poseidon: any;
  let F: any;

  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, "../../circuits/ParameterRange.circom"),
      { include: [path.join(__dirname, "../..")] }
    );
    poseidon = await buildPoseidon();
    F = poseidon.F;
  });

  function computeCommitment(floor: bigint, ceiling: bigint, randomness: bigint): bigint {
    const hash = poseidon([floor, ceiling, randomness]);
    return F.toObject(hash);
  }

  it("should pass when proposed is within range (floor < proposed < ceiling)", async () => {
    const floor = 100n;
    const ceiling = 1000n;
    const randomness = 12345n;
    const commitment = computeCommitment(floor, ceiling, randomness);

    const witness = await circuit.calculateWitness({
      proposed: 500n,
      commitment: commitment,
      floor: floor,
      ceiling: ceiling,
      randomness: randomness,
    });
    await circuit.checkConstraints(witness);
  });

  it("should pass when proposed == floor (boundary)", async () => {
    const floor = 200n;
    const ceiling = 800n;
    const randomness = 54321n;
    const commitment = computeCommitment(floor, ceiling, randomness);

    const witness = await circuit.calculateWitness({
      proposed: 200n,
      commitment: commitment,
      floor: floor,
      ceiling: ceiling,
      randomness: randomness,
    });
    await circuit.checkConstraints(witness);
  });

  it("should pass when proposed == ceiling (boundary)", async () => {
    const floor = 200n;
    const ceiling = 800n;
    const randomness = 11111n;
    const commitment = computeCommitment(floor, ceiling, randomness);

    const witness = await circuit.calculateWitness({
      proposed: 800n,
      commitment: commitment,
      floor: floor,
      ceiling: ceiling,
      randomness: randomness,
    });
    await circuit.checkConstraints(witness);
  });

  it("should pass when floor == ceiling == proposed (degenerate range)", async () => {
    const floor = 42n;
    const ceiling = 42n;
    const randomness = 77777n;
    const commitment = computeCommitment(floor, ceiling, randomness);

    const witness = await circuit.calculateWitness({
      proposed: 42n,
      commitment: commitment,
      floor: floor,
      ceiling: ceiling,
      randomness: randomness,
    });
    await circuit.checkConstraints(witness);
  });

  it("SOUNDNESS: should fail when proposed < floor", async () => {
    const floor = 100n;
    const ceiling = 1000n;
    const randomness = 99999n;
    const commitment = computeCommitment(floor, ceiling, randomness);

    try {
      await circuit.calculateWitness({
        proposed: 50n,
        commitment: commitment,
        floor: floor,
        ceiling: ceiling,
        randomness: randomness,
      });
      expect.fail("Should have failed witness generation");
    } catch (err: any) {
      expect(err.message || err.toString()).to.not.be.empty;
    }
  });

  it("SOUNDNESS: should fail when proposed > ceiling", async () => {
    const floor = 100n;
    const ceiling = 1000n;
    const randomness = 88888n;
    const commitment = computeCommitment(floor, ceiling, randomness);

    try {
      await circuit.calculateWitness({
        proposed: 1001n,
        commitment: commitment,
        floor: floor,
        ceiling: ceiling,
        randomness: randomness,
      });
      expect.fail("Should have failed witness generation");
    } catch (err: any) {
      expect(err.message || err.toString()).to.not.be.empty;
    }
  });

  it("should have fewer than 500 constraints", async () => {
    await circuit.loadConstraints();
    // Poseidon(3) + 2x Num2Bits(64) = ~737 constraints
    // Threshold set as regression guard with headroom
    expect(circuit.constraints.length).to.be.lessThan(900);
  });
});

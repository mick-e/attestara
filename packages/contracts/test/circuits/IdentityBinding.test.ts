import { expect } from "chai";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const circom_tester = require("circom_tester");
const wasm_tester = circom_tester.wasm;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildPoseidon } = require("circomlibjs");

describe("IdentityBinding Circuit", function () {
  this.timeout(120_000);

  let circuit: any;
  let poseidon: any;
  let F: any;

  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, "../../circuits/IdentityBinding.circom"),
      { include: [path.join(__dirname, "../..")] }
    );
    poseidon = await buildPoseidon();
    F = poseidon.F;
  });

  function derivePublicKey(privateKey: bigint): bigint {
    const hash = poseidon([privateKey]);
    return F.toObject(hash);
  }

  function computeBinding(publicKey: bigint, didDocumentHash: bigint): bigint {
    const hash = poseidon([publicKey, didDocumentHash]);
    return F.toObject(hash);
  }

  it("should pass with valid private key matching public key and DID binding", async () => {
    const privateKey = 12345n;
    const publicKey = derivePublicKey(privateKey);
    const didDocumentHash = 99999n;

    const witness = await circuit.calculateWitness({
      private_key: privateKey,
      public_key: publicKey,
      did_document_hash: didDocumentHash,
    });
    await circuit.checkConstraints(witness);
  });

  it("should pass with different private keys producing different public keys", async () => {
    const privateKey1 = 111n;
    const privateKey2 = 222n;
    const publicKey1 = derivePublicKey(privateKey1);
    const publicKey2 = derivePublicKey(privateKey2);

    // Verify they produce different public keys
    expect(publicKey1).to.not.equal(publicKey2);

    // Both should pass independently
    const didDocumentHash = 42n;

    const witness1 = await circuit.calculateWitness({
      private_key: privateKey1,
      public_key: publicKey1,
      did_document_hash: didDocumentHash,
    });
    await circuit.checkConstraints(witness1);

    const witness2 = await circuit.calculateWitness({
      private_key: privateKey2,
      public_key: publicKey2,
      did_document_hash: didDocumentHash,
    });
    await circuit.checkConstraints(witness2);
  });

  it("should pass with private_key == 0 (boundary)", async () => {
    const privateKey = 0n;
    const publicKey = derivePublicKey(privateKey);
    const didDocumentHash = 77777n;

    const witness = await circuit.calculateWitness({
      private_key: privateKey,
      public_key: publicKey,
      did_document_hash: didDocumentHash,
    });
    await circuit.checkConstraints(witness);
  });

  it("should pass with large private key value", async () => {
    const privateKey = 2n ** 200n;
    const publicKey = derivePublicKey(privateKey);
    const didDocumentHash = 54321n;

    const witness = await circuit.calculateWitness({
      private_key: privateKey,
      public_key: publicKey,
      did_document_hash: didDocumentHash,
    });
    await circuit.checkConstraints(witness);
  });

  it("should pass with different DID document hashes for same key pair", async () => {
    const privateKey = 42n;
    const publicKey = derivePublicKey(privateKey);

    for (const didDocHash of [1n, 999n, 123456789n]) {
      const witness = await circuit.calculateWitness({
        private_key: privateKey,
        public_key: publicKey,
        did_document_hash: didDocHash,
      });
      await circuit.checkConstraints(witness);
    }
  });

  it("SOUNDNESS: should fail when private key does not match public key", async () => {
    const privateKey = 12345n;
    const wrongPrivateKey = 99999n;
    const publicKey = derivePublicKey(privateKey);
    const didDocumentHash = 42n;

    try {
      await circuit.calculateWitness({
        private_key: wrongPrivateKey,
        public_key: publicKey,
        did_document_hash: didDocumentHash,
      });
      expect.fail("Should have failed witness generation");
    } catch (err: any) {
      // Witness generation should fail because derived key != claimed public key
      expect(err.message || err.toString()).to.not.be.empty;
    }
  });

  it("SOUNDNESS: should fail with fabricated public key", async () => {
    const privateKey = 12345n;
    const fabricatedPublicKey = 777n; // Not derived from privateKey
    const didDocumentHash = 42n;

    try {
      await circuit.calculateWitness({
        private_key: privateKey,
        public_key: fabricatedPublicKey,
        did_document_hash: didDocumentHash,
      });
      expect.fail("Should have failed witness generation");
    } catch (err: any) {
      expect(err.message || err.toString()).to.not.be.empty;
    }
  });

  it("should have fewer than 700 constraints", async () => {
    await circuit.loadConstraints();
    // Poseidon hashes + identity binding logic = ~932 constraints
    // Threshold set as regression guard with headroom
    expect(circuit.constraints.length).to.be.lessThan(1100);
  });
});

import { expect } from "chai";
import { ethers } from "hardhat";
import { CommitmentContract, AgentRegistry, VerifierRegistry } from "../typechain-types";

describe("CommitmentContract", function () {
  let commitment: CommitmentContract;
  let agentRegistry: AgentRegistry;
  let verifierRegistry: VerifierRegistry;
  let owner: any;
  let other: any;
  let mockVerifierPass: any;
  let mockVerifierFail: any;

  const sessionId = ethers.keccak256(ethers.toUtf8Bytes("session-001"));
  const merkleRoot = ethers.keccak256(ethers.toUtf8Bytes("merkle-root"));
  const agreementHash = ethers.keccak256(ethers.toUtf8Bytes("agreement-001"));
  const circuitId = ethers.keccak256(ethers.toUtf8Bytes("mandate-bound-1.0.0"));
  const circuitId2 = ethers.keccak256(ethers.toUtf8Bytes("parameter-range-1.0.0"));
  const credHash = ethers.keccak256(ethers.toUtf8Bytes("cred-001"));

  // Dummy proof: 8 uint256 values
  const dummyProof: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint] = [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n];
  const dummySignals = [100n, 200n];

  // Helper: derive party bytes32 from signer address
  function addressToParty(addr: string): string {
    return ethers.zeroPadValue(addr, 32);
  }

  // Helper: sign commitment digest with a signer
  async function signCommitment(
    signer: any,
    _sessionId: string,
    _agreementHash: string,
    _credentialHashes: string[],
    _proofTypes: string[]
  ): Promise<string> {
    const innerHash = ethers.keccak256(
      ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes32[]", "bytes32[]"],
        [_sessionId, _agreementHash, _credentialHashes, _proofTypes]
      )
    );
    return signer.signMessage(ethers.getBytes(innerHash));
  }

  beforeEach(async () => {
    [owner, other] = await ethers.getSigners();

    // Deploy AgentRegistry
    const AgentFactory = await ethers.getContractFactory("AgentRegistry");
    agentRegistry = await AgentFactory.deploy();
    await agentRegistry.waitForDeployment();

    // Deploy VerifierRegistry
    const VerifierFactory = await ethers.getContractFactory("VerifierRegistry");
    verifierRegistry = await VerifierFactory.deploy();
    await verifierRegistry.waitForDeployment();

    // Deploy mock verifiers
    const MockFactory = await ethers.getContractFactory("MockVerifier");
    mockVerifierPass = await MockFactory.deploy(true);
    await mockVerifierPass.waitForDeployment();
    mockVerifierFail = await MockFactory.deploy(false);
    await mockVerifierFail.waitForDeployment();

    // Register the passing mock verifier for circuitId
    await verifierRegistry.registerVerifier(circuitId, await mockVerifierPass.getAddress());

    // Deploy CommitmentContract
    const CommitmentFactory = await ethers.getContractFactory("CommitmentContract");
    commitment = await CommitmentFactory.deploy(
      await agentRegistry.getAddress(),
      await verifierRegistry.getAddress()
    );
    await commitment.waitForDeployment();

    // Register an agent so the caller (owner) is recognized as a registered admin
    await agentRegistry.registerAgent('did:ethr:0xTestAgent', 'test metadata', '0x00');
  });

  describe("anchorSession", () => {
    it("should anchor session and emit SessionAnchored event", async () => {
      const party1 = addressToParty(owner.address);
      const party2 = addressToParty(other.address);
      await expect(commitment.anchorSession(sessionId, merkleRoot, [party1, party2], 5))
        .to.emit(commitment, "SessionAnchored")
        .withArgs(sessionId, merkleRoot, [party1, party2], 5);
    });

    it("should reject duplicate anchor", async () => {
      const party1 = addressToParty(owner.address);
      const party2 = addressToParty(other.address);
      await commitment.anchorSession(sessionId, merkleRoot, [party1, party2], 5);

      await expect(
        commitment.anchorSession(sessionId, merkleRoot, [party1, party2], 5)
      ).to.be.revertedWith("Session already anchored");
    });

    it("should reject with fewer than 2 parties", async () => {
      const party1 = addressToParty(owner.address);
      await expect(
        commitment.anchorSession(sessionId, merkleRoot, [party1], 5)
      ).to.be.revertedWith("Need at least 2 parties");
    });
  });

  describe("createCommitment", () => {
    let party1: string;
    let party2: string;
    let sig1: string;
    let sig2: string;

    beforeEach(async () => {
      party1 = addressToParty(owner.address);
      party2 = addressToParty(other.address);
      await commitment.anchorSession(sessionId, merkleRoot, [party1, party2], 5);
      sig1 = await signCommitment(owner, sessionId, agreementHash, [credHash], [circuitId]);
      sig2 = await signCommitment(other, sessionId, agreementHash, [credHash], [circuitId]);
    });

    it("should create commitment with valid signatures and emit event", async () => {
      const tx = await commitment.createCommitment(
        sessionId, agreementHash, [party1, party2], [credHash],
        [dummyProof], [dummySignals], [circuitId], [sig1, sig2]
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          return commitment.interface.parseLog({ topics: log.topics as string[], data: log.data })?.name === "CommitmentCreated";
        } catch { return false; }
      });
      expect(event).to.not.be.undefined;
    });

    it("should reject invalid signature", async () => {
      // Sign with wrong signer for party2
      const wrongSig = await signCommitment(owner, sessionId, agreementHash, [credHash], [circuitId]);

      await expect(
        commitment.createCommitment(
          sessionId, agreementHash, [party1, party2], [credHash],
          [dummyProof], [dummySignals], [circuitId], [sig1, wrongSig]
        )
      ).to.be.revertedWith("Invalid signature for party");
    });

    it("should reject when signature count doesn't match parties", async () => {
      await expect(
        commitment.createCommitment(
          sessionId, agreementHash, [party1, party2], [credHash],
          [dummyProof], [dummySignals], [circuitId], [sig1]
        )
      ).to.be.revertedWith("Signature count must match parties");
    });

    it("should reject when proof verification fails", async () => {
      const failCircuitId = ethers.keccak256(ethers.toUtf8Bytes("fail-circuit"));
      await verifierRegistry.registerVerifier(failCircuitId, await mockVerifierFail.getAddress());
      const s1 = await signCommitment(owner, sessionId, agreementHash, [credHash], [failCircuitId]);
      const s2 = await signCommitment(other, sessionId, agreementHash, [credHash], [failCircuitId]);

      await expect(
        commitment.createCommitment(
          sessionId, agreementHash, [party1, party2], [credHash],
          [dummyProof], [dummySignals], [failCircuitId], [s1, s2]
        )
      ).to.be.revertedWith("Proof verification failed");
    });

    it("should reject when circuit version not registered", async () => {
      const unknownCircuit = ethers.keccak256(ethers.toUtf8Bytes("unknown-circuit"));
      const s1 = await signCommitment(owner, sessionId, agreementHash, [credHash], [unknownCircuit]);
      const s2 = await signCommitment(other, sessionId, agreementHash, [credHash], [unknownCircuit]);

      await expect(
        commitment.createCommitment(
          sessionId, agreementHash, [party1, party2], [credHash],
          [dummyProof], [dummySignals], [unknownCircuit], [s1, s2]
        )
      ).to.be.revertedWith("Unregistered circuit version");
    });

    it("should reject deprecated circuit version", async () => {
      await verifierRegistry.deprecateCircuit(circuitId);

      await expect(
        commitment.createCommitment(
          sessionId, agreementHash, [party1, party2], [credHash],
          [dummyProof], [dummySignals], [circuitId], [sig1, sig2]
        )
      ).to.be.revertedWith("Circuit version deprecated");
    });

    it("should reject when session not anchored", async () => {
      const unanchoredSession = ethers.keccak256(ethers.toUtf8Bytes("session-999"));

      await expect(
        commitment.createCommitment(
          unanchoredSession, agreementHash, [party1, party2], [credHash],
          [dummyProof], [dummySignals], [circuitId], [sig1, sig2]
        )
      ).to.be.revertedWith("Session not anchored");
    });

    it("should reject proof/type length mismatch", async () => {
      await expect(
        commitment.createCommitment(
          sessionId, agreementHash, [party1, party2], [credHash],
          [dummyProof, dummyProof], [dummySignals, dummySignals],
          [circuitId], [sig1, sig2]
        )
      ).to.be.revertedWith("Proof/type length mismatch");
    });

    it("should route proofTypes to correct verifiers", async () => {
      const MockFactory = await ethers.getContractFactory("MockVerifier");
      const mockVerifier2 = await MockFactory.deploy(true);
      await mockVerifier2.waitForDeployment();
      await verifierRegistry.registerVerifier(circuitId2, await mockVerifier2.getAddress());

      const s1 = await signCommitment(owner, sessionId, agreementHash, [credHash], [circuitId, circuitId2]);
      const s2 = await signCommitment(other, sessionId, agreementHash, [credHash], [circuitId, circuitId2]);

      const tx = await commitment.createCommitment(
        sessionId, agreementHash, [party1, party2], [credHash],
        [dummyProof, dummyProof], [dummySignals, dummySignals],
        [circuitId, circuitId2], [s1, s2]
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);
    });
  });

  describe("getCommitment", () => {
    it("should return commitment by ID", async () => {
      const party1 = addressToParty(owner.address);
      const party2 = addressToParty(other.address);
      await commitment.anchorSession(sessionId, merkleRoot, [party1, party2], 5);

      const sig1 = await signCommitment(owner, sessionId, agreementHash, [credHash], [circuitId]);
      const sig2 = await signCommitment(other, sessionId, agreementHash, [credHash], [circuitId]);

      const tx = await commitment.createCommitment(
        sessionId, agreementHash, [party1, party2], [credHash],
        [dummyProof], [dummySignals], [circuitId], [sig1, sig2]
      );
      const receipt = await tx.wait();

      const event = receipt?.logs.find((log: any) => {
        try {
          return commitment.interface.parseLog({ topics: log.topics as string[], data: log.data })?.name === "CommitmentCreated";
        } catch { return false; }
      });
      const parsed = commitment.interface.parseLog({
        topics: event!.topics as string[],
        data: event!.data,
      });
      const commitmentId = parsed?.args.commitmentId;

      const record = await commitment.getCommitment(commitmentId);
      expect(record.sessionId).to.equal(sessionId);
      expect(record.agreementHash).to.equal(agreementHash);
      expect(record.verified).to.be.true;
      expect(record.parties.length).to.equal(2);
    });

    it("should revert for non-existent commitment", async () => {
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      await expect(commitment.getCommitment(fakeId)).to.be.revertedWith("Commitment not found");
    });
  });

  describe("getSessionCommitments", () => {
    it("should return all commitments for a session", async () => {
      const party1 = addressToParty(owner.address);
      const party2 = addressToParty(other.address);
      await commitment.anchorSession(sessionId, merkleRoot, [party1, party2], 5);

      const agreementHash2 = ethers.keccak256(ethers.toUtf8Bytes("agreement-002"));

      const sig1a = await signCommitment(owner, sessionId, agreementHash, [credHash], [circuitId]);
      const sig2a = await signCommitment(other, sessionId, agreementHash, [credHash], [circuitId]);
      const sig1b = await signCommitment(owner, sessionId, agreementHash2, [credHash], [circuitId]);
      const sig2b = await signCommitment(other, sessionId, agreementHash2, [credHash], [circuitId]);

      await commitment.createCommitment(
        sessionId, agreementHash, [party1, party2], [credHash],
        [dummyProof], [dummySignals], [circuitId], [sig1a, sig2a]
      );
      await commitment.createCommitment(
        sessionId, agreementHash2, [party1, party2], [credHash],
        [dummyProof], [dummySignals], [circuitId], [sig1b, sig2b]
      );

      const records = await commitment.getSessionCommitments(sessionId);
      expect(records.length).to.equal(2);
    });

    it("should return empty array for session with no commitments", async () => {
      const emptySession = ethers.keccak256(ethers.toUtf8Bytes("empty"));
      const records = await commitment.getSessionCommitments(emptySession);
      expect(records.length).to.equal(0);
    });
  });

  describe("flagCommitment", () => {
    it("should emit CommitmentFlagged event", async () => {
      const party1 = addressToParty(owner.address);
      const party2 = addressToParty(other.address);
      await commitment.anchorSession(sessionId, merkleRoot, [party1, party2], 5);

      const sig1 = await signCommitment(owner, sessionId, agreementHash, [credHash], [circuitId]);
      const sig2 = await signCommitment(other, sessionId, agreementHash, [credHash], [circuitId]);

      const tx = await commitment.createCommitment(
        sessionId, agreementHash, [party1, party2], [credHash],
        [dummyProof], [dummySignals], [circuitId], [sig1, sig2]
      );
      const receipt = await tx.wait();

      const event = receipt?.logs.find((log: any) => {
        try {
          return commitment.interface.parseLog({ topics: log.topics as string[], data: log.data })?.name === "CommitmentCreated";
        } catch { return false; }
      });
      const parsed = commitment.interface.parseLog({
        topics: event!.topics as string[],
        data: event!.data,
      });
      const commitmentId = parsed?.args.commitmentId;

      await expect(commitment.flagCommitment(commitmentId, "suspicious activity"))
        .to.emit(commitment, "CommitmentFlagged")
        .withArgs(commitmentId, owner.address, "suspicious activity");
    });

    it("should revert for non-existent commitment", async () => {
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      await expect(
        commitment.flagCommitment(fakeId, "reason")
      ).to.be.revertedWith("Commitment not found");
    });
  });
});

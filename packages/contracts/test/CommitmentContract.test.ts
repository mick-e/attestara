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
  const circuitId = ethers.keccak256(ethers.toUtf8Bytes("mandate-bound-v1"));
  const circuitId2 = ethers.keccak256(ethers.toUtf8Bytes("param-range-v1"));
  const party1 = ethers.keccak256(ethers.toUtf8Bytes("agent-1"));
  const party2 = ethers.keccak256(ethers.toUtf8Bytes("agent-2"));
  const credHash = ethers.keccak256(ethers.toUtf8Bytes("cred-001"));

  // Dummy proof: 8 uint256 values
  const dummyProof: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint] = [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n];
  const dummySignals = [100n, 200n];
  const dummySig1 = ethers.toUtf8Bytes("sig1");
  const dummySig2 = ethers.toUtf8Bytes("sig2");

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
  });

  describe("anchorSession", () => {
    it("should anchor session and emit SessionAnchored event", async () => {
      await expect(commitment.anchorSession(sessionId, merkleRoot, [party1, party2], 5))
        .to.emit(commitment, "SessionAnchored")
        .withArgs(sessionId, merkleRoot, [party1, party2], 5);
    });

    it("should reject duplicate anchor", async () => {
      await commitment.anchorSession(sessionId, merkleRoot, [party1, party2], 5);

      await expect(
        commitment.anchorSession(sessionId, merkleRoot, [party1, party2], 5)
      ).to.be.revertedWith("Session already anchored");
    });
  });

  describe("createCommitment", () => {
    beforeEach(async () => {
      await commitment.anchorSession(sessionId, merkleRoot, [party1, party2], 5);
    });

    it("should create commitment with passing mock verifier and emit event", async () => {
      const tx = await commitment.createCommitment(
        sessionId,
        agreementHash,
        [party1, party2],
        [credHash],
        [dummyProof],
        [dummySignals],
        [circuitId],
        [dummySig1, dummySig2]
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          return commitment.interface.parseLog({ topics: log.topics as string[], data: log.data })?.name === "CommitmentCreated";
        } catch { return false; }
      });
      expect(event).to.not.be.undefined;

      const parsed = commitment.interface.parseLog({
        topics: event!.topics as string[],
        data: event!.data,
      });
      expect(parsed?.args.sessionId).to.equal(sessionId);
      expect(parsed?.args.agreementHash).to.equal(agreementHash);
    });

    it("should reject when proof verification fails", async () => {
      // Register failing verifier for a different circuit
      const failCircuitId = ethers.keccak256(ethers.toUtf8Bytes("fail-circuit"));
      await verifierRegistry.registerVerifier(failCircuitId, await mockVerifierFail.getAddress());

      await expect(
        commitment.createCommitment(
          sessionId,
          agreementHash,
          [party1, party2],
          [credHash],
          [dummyProof],
          [dummySignals],
          [failCircuitId],
          [dummySig1, dummySig2]
        )
      ).to.be.revertedWith("Proof verification failed");
    });

    it("should reject when circuit version not registered", async () => {
      const unknownCircuit = ethers.keccak256(ethers.toUtf8Bytes("unknown-circuit"));

      await expect(
        commitment.createCommitment(
          sessionId,
          agreementHash,
          [party1, party2],
          [credHash],
          [dummyProof],
          [dummySignals],
          [unknownCircuit],
          [dummySig1, dummySig2]
        )
      ).to.be.revertedWith("Unregistered circuit version");
    });

    it("should reject when session not anchored", async () => {
      const unanchoredSession = ethers.keccak256(ethers.toUtf8Bytes("session-999"));

      await expect(
        commitment.createCommitment(
          unanchoredSession,
          agreementHash,
          [party1, party2],
          [credHash],
          [dummyProof],
          [dummySignals],
          [circuitId],
          [dummySig1, dummySig2]
        )
      ).to.be.revertedWith("Session not anchored");
    });

    it("should reject when fewer than 2 signatures", async () => {
      await expect(
        commitment.createCommitment(
          sessionId,
          agreementHash,
          [party1, party2],
          [credHash],
          [dummyProof],
          [dummySignals],
          [circuitId],
          [dummySig1] // only 1 signature
        )
      ).to.be.revertedWith("Need at least 2 signatures");
    });

    it("should reject proof/type length mismatch", async () => {
      await expect(
        commitment.createCommitment(
          sessionId,
          agreementHash,
          [party1, party2],
          [credHash],
          [dummyProof, dummyProof], // 2 proofs
          [dummySignals, dummySignals],
          [circuitId], // 1 type
          [dummySig1, dummySig2]
        )
      ).to.be.revertedWith("Proof/type length mismatch");
    });

    it("should route proofTypes to correct verifiers", async () => {
      // Register a second passing verifier for circuitId2
      const MockFactory = await ethers.getContractFactory("MockVerifier");
      const mockVerifier2 = await MockFactory.deploy(true);
      await mockVerifier2.waitForDeployment();
      await verifierRegistry.registerVerifier(circuitId2, await mockVerifier2.getAddress());

      // Create commitment with 2 proofs routed to 2 different verifiers
      const tx = await commitment.createCommitment(
        sessionId,
        agreementHash,
        [party1, party2],
        [credHash],
        [dummyProof, dummyProof],
        [dummySignals, dummySignals],
        [circuitId, circuitId2],
        [dummySig1, dummySig2]
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);
    });
  });

  describe("getCommitment", () => {
    it("should return commitment by ID", async () => {
      await commitment.anchorSession(sessionId, merkleRoot, [party1, party2], 5);

      const tx = await commitment.createCommitment(
        sessionId,
        agreementHash,
        [party1, party2],
        [credHash],
        [dummyProof],
        [dummySignals],
        [circuitId],
        [dummySig1, dummySig2]
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
      await commitment.anchorSession(sessionId, merkleRoot, [party1, party2], 5);

      // Create two commitments
      const agreementHash2 = ethers.keccak256(ethers.toUtf8Bytes("agreement-002"));

      await commitment.createCommitment(
        sessionId, agreementHash, [party1, party2], [credHash],
        [dummyProof], [dummySignals], [circuitId], [dummySig1, dummySig2]
      );
      await commitment.createCommitment(
        sessionId, agreementHash2, [party1, party2], [credHash],
        [dummyProof], [dummySignals], [circuitId], [dummySig1, dummySig2]
      );

      const records = await commitment.getSessionCommitments(sessionId);
      expect(records.length).to.equal(2);
      expect(records[0].agreementHash).to.equal(agreementHash);
      expect(records[1].agreementHash).to.equal(agreementHash2);
    });

    it("should return empty array for session with no commitments", async () => {
      const emptySession = ethers.keccak256(ethers.toUtf8Bytes("empty"));
      const records = await commitment.getSessionCommitments(emptySession);
      expect(records.length).to.equal(0);
    });
  });

  describe("flagCommitment", () => {
    it("should emit CommitmentFlagged event", async () => {
      await commitment.anchorSession(sessionId, merkleRoot, [party1, party2], 5);

      const tx = await commitment.createCommitment(
        sessionId, agreementHash, [party1, party2], [credHash],
        [dummyProof], [dummySignals], [circuitId], [dummySig1, dummySig2]
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

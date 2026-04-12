import { expect } from "chai";
import { ethers } from "hardhat";
import { AgentRegistry } from "../typechain-types";

describe("AgentRegistry", function () {
  let registry: AgentRegistry;
  let owner: any;
  let other: any;

  const testDid = "did:attestara:test-agent-001";
  const testMetadata = '{"name":"TestAgent","version":"1.0"}';
  const testPublicKey = ethers.toUtf8Bytes("test-public-key-bytes");

  beforeEach(async () => {
    [owner, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AgentRegistry");
    registry = await Factory.deploy();
    await registry.waitForDeployment();
  });

  describe("registerAgent", () => {
    it("should register an agent and emit AgentRegistered event", async () => {
      const tx = await registry.registerAgent(testDid, testMetadata, testPublicKey);
      const receipt = await tx.wait();

      // Check event was emitted
      const event = receipt?.logs.find((log: any) => {
        try {
          return registry.interface.parseLog({ topics: log.topics as string[], data: log.data })?.name === "AgentRegistered";
        } catch { return false; }
      });
      expect(event).to.not.be.undefined;

      // Parse the event to get agentId
      const parsed = registry.interface.parseLog({
        topics: event!.topics as string[],
        data: event!.data,
      });
      expect(parsed?.args.did).to.equal(testDid);
      expect(parsed?.args.orgAdmin).to.equal(owner.address);
    });

    it("should reject duplicate DID registration", async () => {
      await registry.registerAgent(testDid, testMetadata, testPublicKey);
      await expect(
        registry.registerAgent(testDid, "other metadata", testPublicKey)
      ).to.be.revertedWith("DID already registered");
    });

    it("should allow different DIDs from the same admin", async () => {
      await registry.registerAgent("did:attestara:agent-1", testMetadata, testPublicKey);
      await registry.registerAgent("did:attestara:agent-2", testMetadata, testPublicKey);

      expect(await registry.isRegistered("did:attestara:agent-1")).to.be.true;
      expect(await registry.isRegistered("did:attestara:agent-2")).to.be.true;
    });
  });

  describe("resolveAgent", () => {
    it("should resolve agent by DID", async () => {
      await registry.registerAgent(testDid, testMetadata, testPublicKey);

      const record = await registry.resolveAgent(testDid);
      expect(record.did).to.equal(testDid);
      expect(record.orgAdmin).to.equal(owner.address);
      expect(record.metadata).to.equal(testMetadata);
      expect(record.active).to.be.true;
      expect(record.registeredAt).to.be.greaterThan(0);
    });

    it("should revert for unregistered DID", async () => {
      await expect(
        registry.resolveAgent("did:attestara:nonexistent")
      ).to.be.revertedWith("Agent not found");
    });

    it("should resolve agent by ID", async () => {
      const tx = await registry.registerAgent(testDid, testMetadata, testPublicKey);
      const receipt = await tx.wait();

      // Extract agentId from event
      const event = receipt?.logs.find((log: any) => {
        try {
          return registry.interface.parseLog({ topics: log.topics as string[], data: log.data })?.name === "AgentRegistered";
        } catch { return false; }
      });
      const parsed = registry.interface.parseLog({
        topics: event!.topics as string[],
        data: event!.data,
      });
      const agentId = parsed?.args.agentId;

      const record = await registry.resolveAgentById(agentId);
      expect(record.did).to.equal(testDid);
      expect(record.active).to.be.true;
    });
  });

  describe("rotateKey", () => {
    let agentId: string;

    beforeEach(async () => {
      const tx = await registry.registerAgent(testDid, testMetadata, testPublicKey);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          return registry.interface.parseLog({ topics: log.topics as string[], data: log.data })?.name === "AgentRegistered";
        } catch { return false; }
      });
      const parsed = registry.interface.parseLog({
        topics: event!.topics as string[],
        data: event!.data,
      });
      agentId = parsed?.args.agentId;
    });

    it("should rotate key and emit KeyRotated event", async () => {
      const newKey = ethers.toUtf8Bytes("new-public-key-bytes");
      await expect(registry.rotateKey(agentId, newKey))
        .to.emit(registry, "KeyRotated")
        .withArgs(agentId, ethers.hexlify(newKey));

      const record = await registry.resolveAgentById(agentId);
      expect(ethers.hexlify(record.publicKey)).to.equal(ethers.hexlify(newKey));
    });

    it("should reject key rotation from non-admin", async () => {
      const newKey = ethers.toUtf8Bytes("malicious-key");
      await expect(
        registry.connect(other).rotateKey(agentId, newKey)
      ).to.be.revertedWith("Not agent admin");
    });
  });

  describe("updateAgent", () => {
    let agentId: string;

    beforeEach(async () => {
      const tx = await registry.registerAgent(testDid, testMetadata, testPublicKey);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          return registry.interface.parseLog({ topics: log.topics as string[], data: log.data })?.name === "AgentRegistered";
        } catch { return false; }
      });
      const parsed = registry.interface.parseLog({
        topics: event!.topics as string[],
        data: event!.data,
      });
      agentId = parsed?.args.agentId;
    });

    it("should update metadata and emit AgentUpdated event", async () => {
      const newMetadata = '{"name":"UpdatedAgent","version":"2.0"}';
      await expect(registry.updateAgent(agentId, newMetadata))
        .to.emit(registry, "AgentUpdated")
        .withArgs(agentId, newMetadata);

      const record = await registry.resolveAgentById(agentId);
      expect(record.metadata).to.equal(newMetadata);
    });

    it("should reject update from non-admin", async () => {
      await expect(
        registry.connect(other).updateAgent(agentId, "hacked")
      ).to.be.revertedWith("Not agent admin");
    });
  });

  describe("deactivateAgent", () => {
    let agentId: string;

    beforeEach(async () => {
      const tx = await registry.registerAgent(testDid, testMetadata, testPublicKey);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          return registry.interface.parseLog({ topics: log.topics as string[], data: log.data })?.name === "AgentRegistered";
        } catch { return false; }
      });
      const parsed = registry.interface.parseLog({
        topics: event!.topics as string[],
        data: event!.data,
      });
      agentId = parsed?.args.agentId;
    });

    it("should deactivate agent and emit event", async () => {
      await expect(registry.deactivateAgent(agentId))
        .to.emit(registry, "AgentDeactivated")
        .withArgs(agentId);

      const record = await registry.resolveAgentById(agentId);
      expect(record.active).to.be.false;
    });

    it("should still be resolvable when deactivated (returns inactive)", async () => {
      await registry.deactivateAgent(agentId);
      const record = await registry.resolveAgent(testDid);
      expect(record.active).to.be.false;
      expect(record.did).to.equal(testDid);
    });

    it("should reject operations on deactivated agent", async () => {
      await registry.deactivateAgent(agentId);

      await expect(
        registry.updateAgent(agentId, "new metadata")
      ).to.be.revertedWith("Agent deactivated");

      await expect(
        registry.rotateKey(agentId, ethers.toUtf8Bytes("new-key"))
      ).to.be.revertedWith("Agent deactivated");
    });

    it("should reject deactivation from non-admin", async () => {
      await expect(
        registry.connect(other).deactivateAgent(agentId)
      ).to.be.revertedWith("Not agent admin");
    });
  });

  describe("isRegistered", () => {
    it("should return true for registered DID", async () => {
      await registry.registerAgent(testDid, testMetadata, testPublicKey);
      expect(await registry.isRegistered(testDid)).to.be.true;
    });

    it("should return false for unregistered DID", async () => {
      expect(await registry.isRegistered("did:attestara:unknown")).to.be.false;
    });
  });

  describe("Admin Access Control", () => {
    it("should return false for addresses that have not registered agents", async () => {
      const [, nonAdmin] = await ethers.getSigners()
      expect(await registry.isRegisteredAdmin(nonAdmin.address)).to.equal(false)
    })

    it("should return true for addresses that have registered an agent", async () => {
      const [deployer] = await ethers.getSigners()
      await registry.registerAgent('did:ethr:0xAdminTest', 'metadata', '0x00')
      expect(await registry.isRegisteredAdmin(deployer.address)).to.equal(true)
    })

    it("should return false for address(0)", async () => {
      expect(await registry.isRegisteredAdmin(ethers.ZeroAddress)).to.equal(false)
    })
  });
});

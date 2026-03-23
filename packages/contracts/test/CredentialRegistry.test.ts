import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { CredentialRegistry } from "../typechain-types";

describe("CredentialRegistry", function () {
  let registry: CredentialRegistry;
  let issuer: any;
  let other: any;

  const credentialHash = ethers.keccak256(ethers.toUtf8Bytes("credential-001"));
  const agentId = ethers.keccak256(ethers.toUtf8Bytes("agent-001"));
  const schemaHash = ethers.keccak256(ethers.toUtf8Bytes("schema-v1"));

  beforeEach(async () => {
    [issuer, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CredentialRegistry");
    registry = await Factory.deploy();
    await registry.waitForDeployment();
  });

  describe("registerCredential", () => {
    it("should register credential with future expiry and emit event", async () => {
      const futureExpiry = (await time.latest()) + 3600; // 1 hour from now

      await expect(registry.registerCredential(credentialHash, agentId, schemaHash, futureExpiry))
        .to.emit(registry, "CredentialRegistered")
        .withArgs(credentialHash, agentId, futureExpiry);
    });

    it("should reject duplicate registration", async () => {
      const futureExpiry = (await time.latest()) + 3600;
      await registry.registerCredential(credentialHash, agentId, schemaHash, futureExpiry);

      await expect(
        registry.registerCredential(credentialHash, agentId, schemaHash, futureExpiry)
      ).to.be.revertedWith("Credential already registered");
    });

    it("should reject expiry in the past", async () => {
      const pastExpiry = (await time.latest()) - 100;

      await expect(
        registry.registerCredential(credentialHash, agentId, schemaHash, pastExpiry)
      ).to.be.revertedWith("Expiry must be in the future");
    });
  });

  describe("isValid", () => {
    it("should return true for active credential", async () => {
      const futureExpiry = (await time.latest()) + 3600;
      await registry.registerCredential(credentialHash, agentId, schemaHash, futureExpiry);

      expect(await registry.isValid(credentialHash)).to.be.true;
    });

    it("should return false after revocation", async () => {
      const futureExpiry = (await time.latest()) + 3600;
      await registry.registerCredential(credentialHash, agentId, schemaHash, futureExpiry);
      await registry.revokeCredential(credentialHash);

      expect(await registry.isValid(credentialHash)).to.be.false;
    });

    it("should return false after expiry", async () => {
      const futureExpiry = (await time.latest()) + 3600;
      await registry.registerCredential(credentialHash, agentId, schemaHash, futureExpiry);

      // Advance time past expiry
      await time.increaseTo(futureExpiry + 1);

      expect(await registry.isValid(credentialHash)).to.be.false;
    });

    it("should return false for unregistered credential", async () => {
      const unknownHash = ethers.keccak256(ethers.toUtf8Bytes("unknown"));
      expect(await registry.isValid(unknownHash)).to.be.false;
    });
  });

  describe("revokeCredential", () => {
    it("should only allow issuer to revoke", async () => {
      const futureExpiry = (await time.latest()) + 3600;
      await registry.registerCredential(credentialHash, agentId, schemaHash, futureExpiry);

      await expect(
        registry.connect(other).revokeCredential(credentialHash)
      ).to.be.revertedWith("Not credential issuer");
    });

    it("should emit CredentialRevoked event", async () => {
      const futureExpiry = (await time.latest()) + 3600;
      await registry.registerCredential(credentialHash, agentId, schemaHash, futureExpiry);

      await expect(registry.revokeCredential(credentialHash))
        .to.emit(registry, "CredentialRevoked")
        .withArgs(credentialHash);
    });

    it("should allow double-revoke without reverting", async () => {
      const futureExpiry = (await time.latest()) + 3600;
      await registry.registerCredential(credentialHash, agentId, schemaHash, futureExpiry);
      await registry.revokeCredential(credentialHash);

      // Should not revert
      await registry.revokeCredential(credentialHash);
      expect(await registry.isValid(credentialHash)).to.be.false;
    });

    it("should revert for non-existent credential", async () => {
      const unknownHash = ethers.keccak256(ethers.toUtf8Bytes("unknown"));
      await expect(
        registry.revokeCredential(unknownHash)
      ).to.be.revertedWith("Credential not found");
    });
  });

  describe("getExpiry", () => {
    it("should return correct expiry", async () => {
      const futureExpiry = (await time.latest()) + 3600;
      await registry.registerCredential(credentialHash, agentId, schemaHash, futureExpiry);

      expect(await registry.getExpiry(credentialHash)).to.equal(futureExpiry);
    });

    it("should revert for non-existent credential", async () => {
      const unknownHash = ethers.keccak256(ethers.toUtf8Bytes("unknown"));
      await expect(registry.getExpiry(unknownHash)).to.be.revertedWith("Credential not found");
    });
  });

  describe("getIssuer", () => {
    it("should return correct issuer", async () => {
      const futureExpiry = (await time.latest()) + 3600;
      await registry.registerCredential(credentialHash, agentId, schemaHash, futureExpiry);

      expect(await registry.getIssuer(credentialHash)).to.equal(issuer.address);
    });

    it("should revert for non-existent credential", async () => {
      const unknownHash = ethers.keccak256(ethers.toUtf8Bytes("unknown"));
      await expect(registry.getIssuer(unknownHash)).to.be.revertedWith("Credential not found");
    });
  });
});

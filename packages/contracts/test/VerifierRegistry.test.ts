import { expect } from "chai";
import { ethers } from "hardhat";
import { VerifierRegistry } from "../typechain-types";

describe("VerifierRegistry", function () {
  let registry: VerifierRegistry;
  let owner: any;
  let other: any;

  const circuitId = ethers.keccak256(ethers.toUtf8Bytes("mandate-bound-v1"));
  const ZERO_ADDRESS = ethers.ZeroAddress;

  beforeEach(async () => {
    [owner, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("VerifierRegistry");
    registry = await Factory.deploy();
    await registry.waitForDeployment();
  });

  describe("registerVerifier", () => {
    it("should register verifier for circuit ID and emit event", async () => {
      await expect(registry.registerVerifier(circuitId, other.address))
        .to.emit(registry, "VerifierRegistered")
        .withArgs(circuitId, other.address);
    });

    it("should return correct verifier address after registration", async () => {
      await registry.registerVerifier(circuitId, other.address);
      expect(await registry.getVerifier(circuitId)).to.equal(other.address);
    });

    it("should only allow owner to register", async () => {
      await expect(
        registry.connect(other).registerVerifier(circuitId, other.address)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("should reject zero address verifier", async () => {
      await expect(
        registry.registerVerifier(circuitId, ZERO_ADDRESS)
      ).to.be.revertedWith("Invalid verifier address");
    });

    it("should allow overwriting a verifier for the same circuit", async () => {
      await registry.registerVerifier(circuitId, other.address);
      const [, , third] = await ethers.getSigners();
      await registry.registerVerifier(circuitId, third.address);
      expect(await registry.getVerifier(circuitId)).to.equal(third.address);
    });
  });

  describe("getVerifier", () => {
    it("should return zero address for unregistered circuit", async () => {
      const unknownCircuit = ethers.keccak256(ethers.toUtf8Bytes("unknown"));
      expect(await registry.getVerifier(unknownCircuit)).to.equal(ZERO_ADDRESS);
    });
  });

  describe("deprecateCircuit", () => {
    it("should deprecate circuit and emit event", async () => {
      await registry.registerVerifier(circuitId, other.address);

      await expect(registry.deprecateCircuit(circuitId))
        .to.emit(registry, "CircuitVersionDeprecated")
        .withArgs(circuitId);
    });

    it("should return true for deprecated circuit", async () => {
      await registry.registerVerifier(circuitId, other.address);
      await registry.deprecateCircuit(circuitId);

      expect(await registry.isDeprecated(circuitId)).to.be.true;
    });

    it("should return false for non-deprecated circuit", async () => {
      await registry.registerVerifier(circuitId, other.address);
      expect(await registry.isDeprecated(circuitId)).to.be.false;
    });

    it("should only allow owner to deprecate", async () => {
      await registry.registerVerifier(circuitId, other.address);

      await expect(
        registry.connect(other).deprecateCircuit(circuitId)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("should revert when deprecating unregistered circuit", async () => {
      const unknownCircuit = ethers.keccak256(ethers.toUtf8Bytes("unknown"));
      await expect(
        registry.deprecateCircuit(unknownCircuit)
      ).to.be.revertedWith("Circuit not registered");
    });
  });
});

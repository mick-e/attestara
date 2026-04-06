import { ethers } from 'hardhat'

const CIRCUITS = [
  { name: 'mandate-bound', version: '1.0.0' },
  { name: 'parameter-range', version: '1.0.0' },
  { name: 'credential-freshness', version: '1.0.0' },
  { name: 'identity-binding', version: '1.0.0' },
]

function deriveCircuitId(name: string, version: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(`${name}-${version}`))
}

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying to Arbitrum Sepolia with:', deployer.address)
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH')

  // Deploy AgentRegistry
  const AgentRegistry = await ethers.getContractFactory('AgentRegistry')
  const agentRegistry = await AgentRegistry.deploy()
  await agentRegistry.waitForDeployment()
  console.log('AgentRegistry deployed')

  // Deploy CredentialRegistry
  const CredentialRegistry = await ethers.getContractFactory('CredentialRegistry')
  const credentialRegistry = await CredentialRegistry.deploy()
  await credentialRegistry.waitForDeployment()
  console.log('CredentialRegistry deployed')

  // Deploy VerifierRegistry
  const VerifierRegistry = await ethers.getContractFactory('VerifierRegistry')
  const verifierRegistry = await VerifierRegistry.deploy()
  await verifierRegistry.waitForDeployment()
  console.log('VerifierRegistry deployed')

  // Deploy CommitmentContract
  const CommitmentContract = await ethers.getContractFactory('CommitmentContract')
  const commitmentContract = await CommitmentContract.deploy(
    await agentRegistry.getAddress(),
    await verifierRegistry.getAddress()
  )
  await commitmentContract.waitForDeployment()
  console.log('CommitmentContract deployed')

  // Register circuit versions in VerifierRegistry
  // Note: In production, each circuitId maps to a deployed Groth16 verifier contract.
  // For testnet, we register the deployer address as a placeholder verifier
  // to demonstrate the registration flow. Replace with real verifier contracts
  // compiled from circom verification keys before mainnet.
  console.log('\nRegistering circuit versions in VerifierRegistry...')
  const circuitIds: Record<string, string> = {}
  for (const circuit of CIRCUITS) {
    const circuitId = deriveCircuitId(circuit.name, circuit.version)
    await verifierRegistry.registerVerifier(circuitId, deployer.address)
    circuitIds[`${circuit.name}-${circuit.version}`] = circuitId
    console.log(`  ${circuit.name} v${circuit.version}: ${circuitId}`)
  }

  const addresses = {
    agentRegistry: await agentRegistry.getAddress(),
    credentialRegistry: await credentialRegistry.getAddress(),
    verifierRegistry: await verifierRegistry.getAddress(),
    commitmentContract: await commitmentContract.getAddress(),
    circuitIds,
    deployer: deployer.address,
    network: 'arbitrum-sepolia',
    timestamp: new Date().toISOString(),
  }

  const fs = await import('fs')
  fs.writeFileSync('deployments.arbitrum-sepolia.json', JSON.stringify(addresses, null, 2))
  console.log('\nDeployed:', JSON.stringify(addresses, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

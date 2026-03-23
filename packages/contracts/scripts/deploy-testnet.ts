import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying to Arbitrum Sepolia with:', deployer.address)
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH')

  const AgentRegistry = await ethers.getContractFactory('AgentRegistry')
  const agentRegistry = await AgentRegistry.deploy()
  await agentRegistry.waitForDeployment()
  console.log('AgentRegistry deployed')

  const CredentialRegistry = await ethers.getContractFactory('CredentialRegistry')
  const credentialRegistry = await CredentialRegistry.deploy()
  await credentialRegistry.waitForDeployment()
  console.log('CredentialRegistry deployed')

  const VerifierRegistry = await ethers.getContractFactory('VerifierRegistry')
  const verifierRegistry = await VerifierRegistry.deploy()
  await verifierRegistry.waitForDeployment()
  console.log('VerifierRegistry deployed')

  const CommitmentContract = await ethers.getContractFactory('CommitmentContract')
  const commitmentContract = await CommitmentContract.deploy(
    await agentRegistry.getAddress(),
    await verifierRegistry.getAddress()
  )
  await commitmentContract.waitForDeployment()
  console.log('CommitmentContract deployed')

  const addresses = {
    agentRegistry: await agentRegistry.getAddress(),
    credentialRegistry: await credentialRegistry.getAddress(),
    verifierRegistry: await verifierRegistry.getAddress(),
    commitmentContract: await commitmentContract.getAddress(),
    deployer: deployer.address,
    network: 'arbitrum-sepolia',
    timestamp: new Date().toISOString(),
  }

  const fs = await import('fs')
  fs.writeFileSync('deployments.arbitrum-sepolia.json', JSON.stringify(addresses, null, 2))
  console.log('Deployed:', JSON.stringify(addresses, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

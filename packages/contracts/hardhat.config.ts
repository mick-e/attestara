import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      viaIR: true,
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    'arbitrum-sepolia': {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || '',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    'arbitrum-one': {
      url: process.env.ARBITRUM_ONE_RPC_URL || '',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
}

export default config

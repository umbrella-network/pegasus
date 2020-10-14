import Settings from '../types/Settings';

const settings: Settings = {
  port: parseInt(process.env.PORT || '3000'),
  jobs: {
    blockCreation: {
      interval: parseInt(process.env.BLOCK_CREATION_JOB_INTERVAL || '1000')
    }
  },
  redis: {
    url: (process.env.REDIS_URL || 'redis://127.0.0.1:6379')
  },
  mongodb: {
    url: (process.env.MONGODB_URL || 'mongodb://localhost:27017/pegasus')
  },
  blockchain: {
    provider: {
      url: (process.env.BLOCKCHAIN_PROVIDER_URL || 'ws://127.0.0.1:8545'),
      account: process.env.BLOCKCHAIN_ACCOUNT,
      privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY as string
    },
    contracts: {
      chain: {
        address: (process.env.CHAIN_CONTRACT_ADDRESS || 'CHAIN_CONTRACT_ADDRESS')
      }
    }
  }
}

export default settings;

import Settings from '../types/Settings';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../../package.json')

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
      privateKey: process.env.VALIDATOR_PRIVATE_KEY as string
    },
    contracts: {
      chain: {
        name: 'Chain'
      },
      registry: {
        address: process.env.REGISTRY_CONTRACT_ADDRESS as string
      },
      validatorRegistry: {
        name: 'ValidatorRegistry'
      },
    },
    transactions: {
      gasPrice: (parseInt(process.env.GAS_PRICE || '1000000000', 10))
    }
  },
  api: {
    cryptocompare: {
      apiKey: process.env.CRYPTOCOMPARE_API_KEY as string,
      timeout: (parseInt(process.env.CRYPTOCOMPARE_TIMEOUT || '5000', 10))
    },
    genesisVolatility: {
      apiKey: process.env.GENESIS_VOLATILITY_API_KEY as string,
      timeout: (parseInt(process.env.GENESIS_VOLATILITY_TIMEOUT || '5000', 10))
    },
    polygonIO: {
      apiKey: process.env.POLYGON_IO_API_KEY as string,
      timeout: (parseInt(process.env.POLYGON_IO_TIMEOUT || '5000', 10))
    },
    iex: {
      apiKey: process.env.IEX_API_KEY as string,
      timeout: (parseInt(process.env.IEX_TIMEOUT || '5000', 10))
    },
  },
  feedsFile: (process.env.FEEDS_FILE || 'src/config/feeds.yaml'),
  feedsOnChain: (process.env.FEEDS_ON_CHAIN_FILE || 'src/config/feedsOnChain.yaml'),
  version: packageJson.version,
  environment: process.env.ENVIRONMENT,
}

export default settings;

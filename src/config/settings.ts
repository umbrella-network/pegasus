import Settings from '../types/Settings';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../../package.json');

const settings: Settings = {
  port: parseInt(process.env.PORT || '3000'),
  jobs: {
    blockCreation: {
      interval: parseInt(process.env.BLOCK_CREATION_JOB_INTERVAL || '1000'),
    },
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  },
  mongodb: {
    url: process.env.MONGODB_URL || 'mongodb://localhost:27017/pegasus',
  },
  blockchain: {
    provider: {
      url: process.env.BLOCKCHAIN_PROVIDER_URL || 'http://127.0.0.1:8545',
      privateKey: process.env.VALIDATOR_PRIVATE_KEY as string,
    },
    contracts: {
      chain: {
        name: 'Chain',
      },
      registry: {
        address: process.env.REGISTRY_CONTRACT_ADDRESS as string,
      },
      validatorRegistry: {
        name: 'ValidatorRegistry',
      },
    },
    transactions: {
      gasPrice: parseInt(process.env.GAS_PRICE || '1000000000', 10),
    },
  },
  api: {
    cryptocompare: {
      apiKey: process.env.CRYPTOCOMPARE_API_KEY as string,
      timeout: parseInt(process.env.CRYPTOCOMPARE_TIMEOUT || '5000', 10),
      reconnectTimeoutHours: parseInt(process.env.CRYPTOCOMPARE_RECONNECT_TIMEOUT_HOURS || '4', 10),
      resubscribeTimeoutMinutes: parseInt(process.env.CRYPTOCOMPARE_RESUBSCRIBE_INTERVAL_MINUTES || '5', 10),
      truncateCronRule: process.env.CRYPTOCOMPARE_TRUNCATE_CRON_RULE || '0 * * * *', // every beginning of an hour
      truncateIntervalMinutes: parseInt(process.env.CRYPTOCOMPARE_TRUNCATE_INTERVAL_MINUTES || '60', 10),
    },
    coingecko: {
      timeout: parseInt(process.env.COINGECKO_TIMEOUT || '5000', 10),
    },
    coinmarketcap: {
      apiKey: process.env.COINMARKETCAP_API_KEY as string,
      timeout: parseInt(process.env.COINMARKETCAP_TIMEOUT || '5000', 10),
    },
    genesisVolatility: {
      apiKey: process.env.GENESIS_VOLATILITY_API_KEY as string,
      timeout: parseInt(process.env.GENESIS_VOLATILITY_TIMEOUT || '5000', 10),
    },
    polygonIO: {
      apiKey: process.env.POLYGON_IO_API_KEY as string,
      timeout: parseInt(process.env.POLYGON_IO_TIMEOUT || '5000', 10),
    },
    iex: {
      apiKey: process.env.IEX_API_KEY as string,
      timeout: parseInt(process.env.IEX_TIMEOUT || '5000', 10),
    },
  },
  feedsFile:
    process.env.FEEDS_FILE || 'https://raw.githubusercontent.com/umbrella-network/pegasus-feeds/main/feeds.yaml',
  feedsOnChain:
    process.env.FEEDS_ON_CHAIN_FILE ||
    'https://raw.githubusercontent.com/umbrella-network/pegasus-feeds/main/feedsOnChain.yaml',
  signatureTimeout: parseInt(process.env.SIGNATURE_TIMEOUT || '15000', 10),
  dataTimestampOffsetSeconds: parseInt(process.env.DATA_TIMESTAMP_OFFSET_SECONDS || '10', 10),
  version: packageJson.version,
  environment: process.env.ENVIRONMENT || process.env.NODE_ENV,
  name: process.env.NAME || 'default',
};

export default settings;

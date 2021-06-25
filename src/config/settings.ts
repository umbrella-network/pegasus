import Settings from '../types/Settings';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../../package.json');

const settings: Settings = {
  port: parseInt(process.env.PORT || '3000'),
  jobs: {
    blockCreation: {
      interval: parseInt(process.env.BLOCK_CREATION_JOB_INTERVAL || '1000'),
    },
    metricsReporting: {
      interval: parseInt(process.env.METRICS_REPORTING_JOB_INTERVAL || '60000'),
    },
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  },
  mongodb: {
    url: process.env.MONGODB_URL || 'mongodb://localhost:27017/pegasus',
  },
  consensus: {
    retries: parseInt(process.env.CONSENSUS_RETRIES || '2', 10),
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
      waitTime: parseInt(process.env.TX_WAIT_TIME || '60000'),
      minGasPrice: parseInt(process.env.MIN_GAS_PRICE || '5000000000', 10),
      maxGasPrice: parseInt(process.env.MAX_GAS_PRICE || '10000000000', 10),
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
      reconnectTimeout: parseInt(process.env.CRYPTOCOMPARE_TIMEOUT || '30000', 10),
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
      priceUpdateCronRule: process.env.POLYGON_IO_PRICE_UPDATE_CRON_RULE || '* * * * *', // every minute
      truncateCronRule: process.env.POLYGON_IO_TRUNCATE_CRON_RULE || '0 * * * *', // every beginning of an hour
      timeout: parseInt(process.env.POLYGON_IO_TIMEOUT || '5000', 10),
      truncateIntervalMinutes: parseInt(process.env.POLYGON_IO_TRUNCATE_INTERVAL_MINUTES || '60', 10),
    },
    iex: {
      apiKey: process.env.IEX_API_KEY as string,
      timeout: parseInt(process.env.IEX_TIMEOUT || '5000', 10),
    },
    bea: {
      apiKey: process.env.BAE_API_KEY as string,
      timeout: parseInt(process.env.BAE_TIMEOUT || '5000', 10),
    },
  },
  feedsFile: 'https://raw.githubusercontent.com/umbrella-network/pegasus-feeds/feature/add-dafi/dev/feeds.yaml',
  feedsOnChain:
    'https://raw.githubusercontent.com/umbrella-network/pegasus-feeds/feature/add-dafi/dev/feedsOnChain.yaml',
  signatureTimeout: parseInt(process.env.SIGNATURE_TIMEOUT || '15000', 10),
  dataTimestampOffsetSeconds: parseInt(process.env.DATA_TIMESTAMP_OFFSET_SECONDS || '10', 10),
  version: packageJson.version,
  environment: process.env.ENVIRONMENT || process.env.NODE_ENV,
  name: process.env.NAME || 'default',
};

export default settings;

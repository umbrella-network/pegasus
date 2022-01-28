import Settings from '../types/Settings';
import {parseInt} from 'lodash';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../../package.json');

const settings: Settings = {
  port: parseInt(process.env.PORT || '3000'),
  application: {
    root: process.env.NODE_PATH || process.cwd(),
    autoUpdate: {
      enabled: process.env.APPLICATION_AUTO_UPDATE_ENABLED == 'true',
      url: process.env.APPLICATION_AUTO_UPDATE_URL,
      interval: getTimeSetting(parseInt(process.env.APPLICATION_AUTO_UPDATE_INTERVAL || '1800000'), 1000),
    },
  },
  jobs: {
    blockCreation: {
      interval: getTimeSetting(parseInt(process.env.BLOCK_CREATION_JOB_INTERVAL || '10000'), 10000),
      lock: {
        name: process.env.BLOCK_CREATION_LOCK_NAME || 'lock::BlockCreation',
        ttl: getTimeSetting(parseInt(process.env.BLOCK_CREATION_LOCK_TTL || '60'), 60),
      },
    },
    metricsReporting: {
      interval: parseInt(process.env.METRICS_REPORTING_JOB_INTERVAL || '60000'),
      lock: {
        name: process.env.METRICS_REPORTING_LOCK_NAME || 'lock::MetricsReporting',
        ttl: parseInt(process.env.METRICS_REPORTING_LOCK_TTL || '60'),
      },
    },
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    maxRetryTime: parseInt(process.env.MAX_RETRY_TIME as string) || 10000,
  },
  mongodb: {
    url: process.env.MONGODB_URL || 'mongodb://localhost:27017/pegasus',
  },
  consensus: {
    retries: parseInt(process.env.CONSENSUS_RETRIES || '2', 10),
    strategy: process.env.CONSENSUS_STRATEGY || 'simple',
    discrepancyCutoff: parseInt(process.env.CONSENSUS_DISCREPANCY_CUTOFF || '800'),
  },
  blockchains: {
    ethereum: {
      providerUrl: (<string>process.env.BLOCKCHAINS_ETHEREUM_PROVIDER_URL || '').split(','),
    },
  },
  blockchain: {
    providers: resolveBlockchainProviders(),
    provider: {
      urls: getProvidersURLs(),
      privateKey: process.env.VALIDATOR_PRIVATE_KEY as string,
    },
    contracts: {
      chain: {
        name: 'Chain',
      },
      registry: {
        address: process.env.REGISTRY_CONTRACT_ADDRESS as string,
      },
    },
    transactions: {
      waitForBlockTime: parseInt(process.env.WAIT_FOR_BLOCK_TIME || '1000'),
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
      reconnectTimeout: parseInt(process.env.CRYPTOCOMPARE_RECONNECT_TIMEOUT || '30000', 10),
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
      reconnectTimeout: parseInt(process.env.POLYGON_IO_RECONNECT_TIMEOUT || '30000', 10),
    },
    iex: {
      apiKey: process.env.IEX_API_KEY as string,
      timeout: parseInt(process.env.IEX_TIMEOUT || '5000', 10),
    },
    bea: {
      apiKey: process.env.BAE_API_KEY as string,
      timeout: parseInt(process.env.BAE_TIMEOUT || '5000', 10),
    },
    kaiko: {
      apiKey: process.env.KAIKO_API_KEY as string,
      rpcUrl: process.env.KAIKO_RPC_URL || 'gateway-v0-grpc.kaiko.ovh:443',
      timeout: parseInt(process.env.KAIKO_TIMEOUT || '5000', 10),
      priceFreshness: parseInt(process.env.KAIKO_FRESHNESS || '3600', 10),
    },
    optionsPrice: {
      apiKey: process.env.OPTIONS_PRICE_API_KEY as string,
      timeout: parseInt(process.env.OPTIONS_PRICE_TIMEOUT || '5000', 10),
    },
    debug: {
      apiKey: process.env.DEBUG_API_KEY as string,
    },
    uniswap: {
      scannerContractId: <string>process.env.UNISWAP_SCANNER_CONTRACT_ID,
      helperContractId: <string>process.env.UNISWAP_HELPER_CONTRACT_ID,
      startBlock: parseInt(process.env.UNISWAP_START_BLOCK || '0'),
      agentStep: parseInt(process.env.UNISWAP_STEP || '1000'),
      defaultPrecision: Number(process.env.UNISWAP_DEFAULT_PRECISION || '0.5'),
      defaultDiscrepancy: Number(process.env.UNISWAP_DEFAULT_DISCREPANCY || '2'),
      verificationInterval: getTimeSetting(parseInt(process.env.UNISWAP_VERIFICATION_INTERVAL || '1800000'), 1000),
    },
  },
  feedsFile:
    process.env.FEEDS_FILE ||
    'https://raw.githubusercontent.com/umbrella-network/pegasus-feeds/main/prod/bsc/feeds.yaml',
  feedsOnChain:
    process.env.FEEDS_ON_CHAIN_FILE ||
    'https://raw.githubusercontent.com/umbrella-network/pegasus-feeds/main/prod/bsc/feedsOnChain.yaml',
  statusCheckTimeout: parseInt(process.env.STATUS_CHECK_TIMEOUT || '2000', 10),
  signatureTimeout: getTimeSetting(parseInt(process.env.SIGNATURE_TIMEOUT || '20000', 10), 20000),
  dataTimestampOffsetSeconds: parseInt(process.env.DATA_TIMESTAMP_OFFSET_SECONDS || '10', 10),
  version: packageJson.version,
  environment: process.env.ENVIRONMENT || process.env.NODE_ENV,
  name: process.env.NAME || 'default',
};

function getTimeSetting(value: number, min: number): number {
  return value > min ? value : min;
}

function resolveBlockchainProviders() {
  return resolveArray((i) => process.env[`BLOCKCHAIN_PROVIDER_${i}_URL`] as string).reduce((map, item, i) => {
    const name = process.env[`BLOCKCHAIN_PROVIDER_${i}_NAME`] as string;
    if (name) {
      map[name] = item;
    }
    return map;
  }, {} as {[name: string]: string});
}

function resolveArray(iterator: (i: number) => string): string[] {
  const result = [];
  for (let i = 0; i < 10000; ++i) {
    const item = iterator(i);

    if (!item) {
      break;
    }

    result.push(item);
  }

  return result;
}

function getProvidersURLs(): string[] {
  const urls = `${process.env.BLOCKCHAIN_PROVIDER_URL},${process.env.BLOCKCHAIN_PROVIDER_URLS}`
    .split(',')
    .filter((url) => url.startsWith('http'));

  return urls.length > 0 ? urls : ['http://127.0.0.1:8545'];
}

export default settings;

import Settings from '../types/Settings';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../../package.json');

const settings: Settings = {
  port: parseInt(process.env.PORT || '3000'),
  application: {
    root: process.env.NODE_PATH || process.cwd(),
    autoUpdate: {
      // enabled: process.env.APPLICATION_AUTO_UPDATE_ENABLED == 'true',
      enabled: true,
      // url: process.env.APPLICATION_UPDATE_URL,
      url: 'https://umbnet-dev.s3.us-east-2.amazonaws.com/pegasus/ota/manifest.json?response-content-disposition=inline&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEDkaDGV1LWNlbnRyYWwtMSJHMEUCIQCDdv7axdl12UuYVvykF%2ByHbsnNgOzbIz%2FUd6n3vW9M%2BwIgEi1%2FF1AW%2FYZ4wV13ZG%2BrWoHYTpIgiNd9kR4OAQvS0osq%2BwIIYhABGgwwMDgyMDU2ODQyMDciDJJ%2Fs6TALYNIfPzjgyrYAgYJttCeZmx0EsLiuqwSDw4QYs%2BMiD65j%2Bc%2Fo67L1HWJT%2Fp%2FBbDM%2BZhruKBU7wWkX0Zylx%2BZFwQ42EEKbikDUYK752dRs89L7%2BWDEj8mUlC3C86jA9Jz6bBKTqtvvxmo1RkedoCx9T1tthnG%2BKM5lea7eGjo0ogWcpglaHOlKegKjor5%2FgGtE2tKHNi%2BTIHZ4s9qoyWPyjJoOMhwXJQDU8oKqhLg0bLnivYoH%2B9edw%2BJiAaGEkVVp9euGV9bdI7%2BvPBa7iytKtgOZQeHZFt1Ey%2BRKykqifIqIqIsNa2ZFBt8HrjRnslEd8ISL0yrtp7D3w5MIgEOvsuksseoc5R1hRCVFlIWyek%2Fig5By4jFUAsKX3SQFb139HayffbE2KadUsXI8gGO99hh9puVTg7KEhNe9m1o8FHvlmLOX3wp5xCnglchAcuDv%2BxEDRSQZ3PEC1gIK09hSu6cMJiEto8GOrMCs0CLjX4OoHIGUgsH%2BQQGbnPZA8mwWZYwp%2F8DjU13ACKWwR94plDeem0JY7S2ACtUmex1aFQRWl8964LpImA6UfjjA4KtdSlHJkJjcL9UwpVjHzYz1BLM4gi2ZhaLDFkG5onxpFrIHW1BqAQMA1N8y9n6CQCTYRYMHPX3nQ%2Fchnvcvqlse2PHYBiWkKdGuYuRKIeCmr0pqsSLvI3X97T4LY4RLUCkwod8aTLdzEeqZDgouBtBoo%2BrpOPLZZb1fmUijsjZlCdb8kmPtQbt0kVjqYP7gHoFwkd76uizU08%2BTZlQqRs5o4nKNIp0ASmxudoSOy6GNAdemGLZnmWmNJdd3IrxPHBVJfyL3yPLlbQiGg%2B35Gx4pwx4X%2B4Q7oqrOaCxORIFv%2FM09RvBnc0jl72EcRjygA%3D%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20220123T164424Z&X-Amz-SignedHeaders=host&X-Amz-Expires=604800&X-Amz-Credential=ASIAQD2IYZXX2772UH4K%2F20220123%2Fus-east-2%2Fs3%2Faws4_request&X-Amz-Signature=2c2944829794744ca0ccec986444c31cc3eadeb10c16e06c00d53a0099bd69a3',
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
    uniswap: {
      scannerContractId: <string>process.env.UNISWAP_SCANNER_CONTRACT_ID,
      helperContractId: <string>process.env.UNISWAP_HELPER_CONTRACT_ID,
      startBlock: parseInt(process.env.UNISWAP_START_BLOCK || '0'),
      agentStep: parseInt(process.env.UNISWAP_STEP || '1000'),
      defaultPrecision: Number(process.env.UNISWAP_DEFAULT_PRECISION || '0.5'),
      defaultDiscrepancy: Number(process.env.UNISWAP_DEFAULT_DISCREPANCY || '2'),
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

export default settings;

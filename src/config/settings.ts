import {RPCSelectionStrategies} from '../types/RPCSelectionStrategies';
import Settings, {
  BlockchainSettings,
  BlockchainType,
  BlockchainTypeKeys,
  BlockDispatcherSettings,
} from '../types/Settings';
import {TimeoutCodes} from '../types/TimeoutCodes';
import {timeoutWithCode} from '../utils/request';
import './setupDotenv';
import {ChainsIds, ChainsIdsKeys} from '../types/ChainsIds';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../../package.json');

function resolveBlockchainType(chain: ChainsIds): BlockchainType[] | undefined {
  const blockchainType = process.env[`${chain}_TYPE`];
  if (!blockchainType) return undefined;

  const types = blockchainType.split(',');

  return types
    .filter((t) => Object.keys(BlockchainType).includes(t))
    .map((t) => BlockchainType[t as BlockchainTypeKeys]);
}

const defaultByChain: Record<ChainsIds, BlockchainSettings> = {
  bsc: {
    type: resolveBlockchainType(ChainsIds.BSC) || [BlockchainType.LAYER2],
    contractRegistryAddress: process.env.REGISTRY_CONTRACT_ADDRESS,
    transactions: {
      waitForBlockTime: parseInt(process.env.WAIT_FOR_BLOCK_TIME || '1000', 10),
      minGasPrice: 2000000000,
      maxGasPrice: 500000000000,
      mintBalance: {
        warningLimit: '0.06',
        errorLimit: '0.003',
      },
    },
  },
  avax: {
    type: resolveBlockchainType(ChainsIds.AVALANCHE) || [BlockchainType.LAYER2, BlockchainType.ON_CHAIN],
    transactions: {
      waitForBlockTime: 1000,
      minGasPrice: 25000000000,
      maxGasPrice: 250000000000,
      mintBalance: {
        warningLimit: '0.5',
        errorLimit: '0.008',
      },
    },
  },
  polygon: {
    type: resolveBlockchainType(ChainsIds.POLYGON) || [BlockchainType.LAYER2, BlockchainType.ON_CHAIN],
    transactions: {
      waitForBlockTime: 1000,
      minGasPrice: 1000000000,
      maxGasPrice: 500000000000,
      mintBalance: {
        warningLimit: '0.5',
        errorLimit: '0.02',
      },
    },
  },
  arbitrum: {
    type: resolveBlockchainType(ChainsIds.ARBITRUM) || [BlockchainType.LAYER2, BlockchainType.ON_CHAIN],
    transactions: {
      waitForBlockTime: 1000,
      minGasPrice: 100_000_000,
      maxGasPrice: 50_000_000_000,
      mintBalance: {
        warningLimit: '0.05',
        errorLimit: '0.001',
      },
    },
  },
  ethereum: {
    type: resolveBlockchainType(ChainsIds.ETH) || [BlockchainType.LAYER2],
    transactions: {
      waitForBlockTime: 1000,
      minGasPrice: 2000000000,
      maxGasPrice: 500000000000,
      mintBalance: {
        warningLimit: '0.6',
        errorLimit: '0.06',
      },
    },
  },
  linea: {
    type: resolveBlockchainType(ChainsIds.LINEA) || [BlockchainType.ON_CHAIN],
    transactions: {
      waitForBlockTime: 1000,
      minGasPrice: 1000000000,
      maxGasPrice: 100000000000,
      mintBalance: {
        warningLimit: '0.01',
        errorLimit: '0.0001',
      },
    },
  },
};

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
    validatorsResolver: {
      interval: parseInt(process.env.VALIDATORS_RESOLVER_JOB_INTERVAL || '600000'),
      lock: {
        name: process.env.VALIDATORS_RESOLVER_LOCK_NAME || 'lock::ValidatorsResolver',
        ttl: parseInt(process.env.VALIDATORS_RESOLVER_LOCK_TTL || '60'),
      },
    },
    blockDispatcher: resolveBlockDispatcherSettings(),
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
    aggregator: process.env.CONSENSUS_AGGREGATOR || 'original',
    strategy: process.env.CONSENSUS_STRATEGY || 'simple',
    discrepancyCutoff: parseInt(process.env.CONSENSUS_DISCREPANCY_CUTOFF || '800'),
    roundInterval: parseInt(process.env.CONSENSUS_ROUND_INTERVAL || '1000'),
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
      deviationPrivateKey: process.env.DEVIATION_PRIVATE_KEY
        ? (process.env.DEVIATION_PRIVATE_KEY as string)
        : undefined,
    },
    masterChain: {
      chainId: ChainsIds.BSC,
    },
    contracts: {
      bank: {
        name: process.env.STAKING_BANK_NAME || 'StakingBank',
      },
      chain: {
        name: 'Chain',
      },
      feeds: {
        name: 'UmbrellaFeeds',
      },
      registry: {
        address: process.env.REGISTRY_CONTRACT_ADDRESS as string,
      },
    },
    transactions: {
      waitForBlockTime: parseInt(process.env.WAIT_FOR_BLOCK_TIME || '1000'),
      minGasPrice: parseInt(process.env.MIN_GAS_PRICE || '5000000000', 10),
      maxGasPrice: parseInt(process.env.MAX_GAS_PRICE || '10000000000', 10),
      mintBalance: {
        warningLimit: process.env.BALANCE_WARN || '0.1',
        errorLimit: process.env.BALANCE_ERROR || '0.003',
      },
    },
    multiChains: resolveMultichainSettings(),
    resolveStatusTimeout: parseInt(process.env.RESOLVE_STATUS_TIMEOUT || '5000'),
  },
  api: {
    cryptocompare: {
      apiKey: process.env.CRYPTOCOMPARE_API_KEY as string,
      timeout: timeoutWithCode(process.env.CRYPTOCOMPARE_TIMEOUT || '5000', TimeoutCodes.CRYPTOCOMPARE),
      reconnectTimeoutHours: parseInt(process.env.CRYPTOCOMPARE_RECONNECT_TIMEOUT_HOURS || '4', 10),
      resubscribeTimeoutMinutes: parseInt(process.env.CRYPTOCOMPARE_RESUBSCRIBE_INTERVAL_MINUTES || '5', 10),
      truncateCronRule: process.env.CRYPTOCOMPARE_TRUNCATE_CRON_RULE || '0 * * * *', // every beginning of an hour
      truncateIntervalMinutes: parseInt(process.env.CRYPTOCOMPARE_TRUNCATE_INTERVAL_MINUTES || '60', 10),
      reconnectTimeout: parseInt(process.env.CRYPTOCOMPARE_RECONNECT_TIMEOUT || '30000', 10),
    },
    coingecko: {
      timeout: timeoutWithCode(process.env.COINGECKO_TIMEOUT || '5000', TimeoutCodes.COINGECKO),
      maxBatchSize: parseInt(process.env.POLYGON_MAX_BATCH_SIZE || '500', 10),
    },
    polygonIO: {
      apiKey: process.env.POLYGON_IO_API_KEY as string,
      priceUpdateCronRule: process.env.POLYGON_IO_PRICE_UPDATE_CRON_RULE || '* * * * *', // every minute
      truncateCronRule: process.env.POLYGON_IO_TRUNCATE_CRON_RULE || '0 * * * *', // every beginning of an hour
      timeout: timeoutWithCode(process.env.POLYGON_IO_TIMEOUT || '20000', TimeoutCodes.POLYGON_IO),
      truncateIntervalMinutes: parseInt(process.env.POLYGON_IO_TRUNCATE_INTERVAL_MINUTES || '60', 10),
      reconnectTimeout: parseInt(process.env.POLYGON_IO_RECONNECT_TIMEOUT || '30000', 10),
      maxBatchSize: parseInt(process.env.POLYGON_MAX_BATCH_SIZE || '500', 10),
    },
    optionsPrice: {
      apiKey: process.env.OPTIONS_PRICE_API_KEY as string,
      timeout: timeoutWithCode(process.env.OPTIONS_PRICE_TIMEOUT || '5000', TimeoutCodes.OPTIONS_PRICE),
    },
    debug: {
      apiKey: process.env.DEBUG_API_KEY as string,
    },
    uniswap: {
      scannerContractId: <string>process.env.UNISWAP_SCANNER_CONTRACT_ID,
      helperContractId: <string>process.env.UNISWAP_HELPER_CONTRACT_ID,
      startBlock: parseInt(process.env.UNISWAP_START_BLOCK || '0'),
      agentStep: parseInt(process.env.UNISWAP_STEP || '1000'),
      defaultPrecision: Number(process.env.UNISWAP_DEFAULT_PRECISION || '6'),
      defaultDiscrepancy: Number(process.env.UNISWAP_DEFAULT_DISCREPANCY || '1.0'),
      verificationInterval: getTimeSetting(parseInt(process.env.UNISWAP_VERIFICATION_INTERVAL || '1800000'), 1000),
    },
    priceFreshness: parseInt(process.env.PRICE_FRESHNESS || process.env.KAIKO_FRESHNESS || '3600', 10),
  },
  rpcSelectionStrategy: process.env.RPC_SELECTION_STRATEGY || RPCSelectionStrategies.BY_BLOCK_NUMBER,
  feedsFile:
    process.env.FEEDS_FILE ||
    'https://raw.githubusercontent.com/umbrella-network/pegasus-feeds/main/prod/bsc/feeds.yaml',
  feedsOnChain:
    process.env.FEEDS_ON_CHAIN_FILE ||
    'https://raw.githubusercontent.com/umbrella-network/pegasus-feeds/main/prod/bsc/feedsOnChain.yaml',
  feedsCacheRefreshCronRule: process.env.FEEDS_CACHE_REFRESH_CRON_RULE ?? '*/5 * * * *', // every five minutes
  statusCheckTimeout: timeoutWithCode(
    getTimeSetting(parseInt(process.env.STATUS_CHECK_TIMEOUT || '10000', 10), 10000),
    TimeoutCodes.STATUS_CHECK_TIMEOUT,
  ),
  signatureTimeout: timeoutWithCode(
    getTimeSetting(parseInt(process.env.SIGNATURE_TIMEOUT || '30000', 10), 20000),
    TimeoutCodes.SIGNATURE_TIMEOUT,
  ),
  dataTimestampOffsetSeconds: parseInt(process.env.DATA_TIMESTAMP_OFFSET_SECONDS || '10', 10),
  version: packageJson.version,
  environment: process.env.ENVIRONMENT || process.env.NODE_ENV,
  name: process.env.NEW_RELIC_APP_NAME || process.env.NAME || 'default',
  deviationTrigger: {
    heartbeatRounds: getTimeSetting(parseInt(process.env.DEVIATION_HEARTBEAT_ROUNDS || '5'), 3),
    roundLengthSeconds: getTimeSetting(parseInt(process.env.DEVIATION_ROUND_LENGTH || '60'), 30),
    leaderInterval: getTimeSetting(parseInt(process.env.DEVIATION_JOB_INTERVAL || '10000'), 5000),
    lock: {
      name: process.env.DEVIATION_LOCK_NAME || 'lock::DeviationTrigger',
      ttl: getTimeSetting(parseInt(process.env.DEVIATION_LOCK_TTL || '60'), 60),
    },
    feedsFile:
      process.env.DEVIATION_FEEDS_FILE ||
      'https://raw.githubusercontent.com/umbrella-network/pegasus-feeds/main/prod/onChainData128.8.yaml',
  },
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

function resolveMultichainSettings(): Partial<Record<ChainsIds, BlockchainSettings>> {
  const multichains: Partial<Record<ChainsIds, BlockchainSettings>> = {};
  let chain: ChainsIdsKeys;

  for (chain of Object.keys(ChainsIds) as ChainsIdsKeys[]) {
    if (isEmptyBlockchainSettings(chain)) {
      console.log(`[resolveMultichainSettings] ${chain} EMPTY env`);
      continue;
    }

    console.log(`[resolveMultichainSettings] ${chain} SETUP OK`);

    multichains[ChainsIds[chain]] = {
      type: defaultByChain[ChainsIds[chain]].type,
      contractRegistryAddress:
        process.env[`${chain}_REGISTRY_CONTRACT_ADDRESS`] || defaultByChain[ChainsIds[chain]]?.contractRegistryAddress,
      providerUrl: process.env[`${chain}_BLOCKCHAIN_PROVIDER_URL`],
      transactions: {
        waitForBlockTime:
          parseInt(process.env[`${chain}_WAIT_FOR_BLOCK_TIME`] as string, 10) ||
          defaultByChain[ChainsIds[chain]].transactions.waitForBlockTime,
        minGasPrice:
          parseInt(process.env[`${chain}_MIN_GAS_PRICE`] as string, 10) ||
          defaultByChain[ChainsIds[chain]].transactions.minGasPrice,
        maxGasPrice:
          parseInt(process.env[`${chain}_MAX_GAS_PRICE`] as string, 10) ||
          defaultByChain[ChainsIds[chain]].transactions.maxGasPrice,
        mintBalance: {
          warningLimit:
            process.env[`${chain}_BALANCE_WARN`] ||
            defaultByChain[ChainsIds[chain]].transactions.mintBalance.warningLimit,
          errorLimit:
            process.env[`${chain}_BALANCE_ERROR`] ||
            defaultByChain[ChainsIds[chain]].transactions.mintBalance.errorLimit,
        },
      },
    };
  }

  return multichains;
}

function isEmptyBlockchainSettings(chain: ChainsIdsKeys): boolean {
  return (
    !process.env[`${chain}_BLOCKCHAIN_PROVIDER_URL`] ||
    (!process.env[`${chain}_REGISTRY_CONTRACT_ADDRESS`] && !defaultByChain[ChainsIds[chain]]?.contractRegistryAddress)
  );
}

function resolveBlockDispatcherSettings(): Partial<Record<ChainsIds, BlockDispatcherSettings>> {
  const blockDispatchers: Partial<Record<ChainsIds, BlockDispatcherSettings>> = {};
  let chain: ChainsIdsKeys;

  for (chain of Object.keys(ChainsIds) as ChainsIdsKeys[]) {
    if (
      !process.env[`${chain}_REGISTRY_CONTRACT_ADDRESS`] &&
      !defaultByChain[ChainsIds[chain]]?.contractRegistryAddress
    )
      continue;

    blockDispatchers[ChainsIds[chain]] = {
      interval: parseInt(
        process.env[`${chain}_DISPATCHER_INTERVAL`] || process.env.BLOCK_CREATION_JOB_INTERVAL || '10000',
        10,
      ),
      deviationInterval: parseInt(process.env[`${chain}_DEVIATION_DISPATCHER_INTERVAL`] || '2000', 10),
    };
  }

  return blockDispatchers;
}

export default settings;

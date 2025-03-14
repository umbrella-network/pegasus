import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

import {RPCSelectionStrategies} from '../types/RPCSelectionStrategies.js';
import {TimeoutCodes} from '../types/TimeoutCodes.js';
import {timeoutWithCode} from '../utils/request.js';
import {ChainsIds, ChainsIdsKeys} from '../types/ChainsIds.js';
import {DexProtocolName} from '../types/Dexes.js';
import './setupDotenv.js';

import Settings, {
  BlockchainSettings,
  BlockchainType,
  BlockchainTypeKeys,
  BlockDispatcherSettings,
  SchedulerFetcherSettings,
} from '../types/Settings.js';

import {FetcherName} from '../types/fetchers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = JSON.parse(fs.readFileSync(__dirname + '/../../package.json', 'utf8'));

function parseNl(s: string): string {
  return s ? s.replace(/\\n/g, '\n').split('\n').join('\n') : '';
}

function clearLastSlash(s: string | undefined): string {
  if (!s) return '';

  return s.endsWith('/') ? s.slice(0, -1) : s;
}

function resolveBlockchainType(chain: ChainsIds): BlockchainType[] | undefined {
  const blockchainType = process.env[`${chain}_TYPE`];
  if (!blockchainType) return undefined;

  const types = blockchainType.split(',');

  return types
    .filter((t) => Object.keys(BlockchainType).includes(t))
    .map((t) => BlockchainType[t as BlockchainTypeKeys]);
}

function resolveGasPriceInterval(chain: ChainsIds): number | undefined {
  const interval = process.env[`${chain}_GAS_PRICE_CHECK_INTERVAL`];
  if (!interval) return;

  return parseInt(interval, 10);
}

function resolveDefaultGasEstimation(chain: ChainsIds): boolean {
  return !!process.env[`${chain}_USE_DEFAULT_GAS_ESTIMATION`];
}

const defaultByChain: Record<ChainsIds, BlockchainSettings> = {
  [ChainsIds.BSC]: {
    type: resolveBlockchainType(ChainsIds.BSC) || [BlockchainType.LAYER2],
    contractRegistryAddress: process.env.REGISTRY_CONTRACT_ADDRESS,
    gasPriceCheckBlocksInterval: resolveGasPriceInterval(ChainsIds.BSC),
    transactions: {
      useDefaultGasEstimation: resolveDefaultGasEstimation(ChainsIds.BSC),
      waitForBlockTime: parseInt(process.env.WAIT_FOR_BLOCK_TIME || '1000', 10),
      minGasPrice: 2000000000,
      minBalance: {
        warningLimit: '0.06',
        errorLimit: '0.003',
      },
    },
  },
  [ChainsIds.AVALANCHE]: {
    type: resolveBlockchainType(ChainsIds.AVALANCHE) || [BlockchainType.LAYER2, BlockchainType.ON_CHAIN],
    gasPriceCheckBlocksInterval: resolveGasPriceInterval(ChainsIds.AVALANCHE),
    transactions: {
      useDefaultGasEstimation: resolveDefaultGasEstimation(ChainsIds.AVALANCHE),
      waitForBlockTime: 1000,
      minGasPrice: 25000000000,
      minBalance: {
        warningLimit: '0.5',
        errorLimit: '0.008',
      },
    },
  },
  [ChainsIds.POLYGON]: {
    type: resolveBlockchainType(ChainsIds.POLYGON) || [BlockchainType.LAYER2, BlockchainType.ON_CHAIN],
    gasPriceCheckBlocksInterval: resolveGasPriceInterval(ChainsIds.POLYGON),
    transactions: {
      useDefaultGasEstimation: resolveDefaultGasEstimation(ChainsIds.POLYGON),
      waitForBlockTime: 1000,
      minGasPrice: 1000000000,
      minBalance: {
        warningLimit: '0.5',
        errorLimit: '0.01',
      },
    },
  },
  [ChainsIds.ARBITRUM]: {
    type: resolveBlockchainType(ChainsIds.ARBITRUM) || [BlockchainType.LAYER2, BlockchainType.ON_CHAIN],
    gasPriceCheckBlocksInterval: resolveGasPriceInterval(ChainsIds.ARBITRUM),
    transactions: {
      useDefaultGasEstimation: resolveDefaultGasEstimation(ChainsIds.ARBITRUM),
      waitForBlockTime: 1000,
      minGasPrice: 100_000_000,
      minBalance: {
        warningLimit: '0.001',
        errorLimit: '0.00001',
      },
    },
  },
  [ChainsIds.ETH]: {
    type: resolveBlockchainType(ChainsIds.ETH) || [BlockchainType.LAYER2],
    gasPriceCheckBlocksInterval: resolveGasPriceInterval(ChainsIds.ETH),
    transactions: {
      useDefaultGasEstimation: resolveDefaultGasEstimation(ChainsIds.ETH),
      waitForBlockTime: 1000,
      minGasPrice: 2000000000,
      minBalance: {
        warningLimit: '0.6',
        errorLimit: '0.06',
      },
    },
  },
  [ChainsIds.LINEA]: {
    type: resolveBlockchainType(ChainsIds.LINEA) || [BlockchainType.ON_CHAIN],
    gasPriceCheckBlocksInterval: resolveGasPriceInterval(ChainsIds.LINEA),
    transactions: {
      useDefaultGasEstimation: resolveDefaultGasEstimation(ChainsIds.LINEA),
      waitForBlockTime: 1000,
      minGasPrice: 100000000,
      minBalance: {
        warningLimit: '0.01',
        errorLimit: '0.0005',
      },
    },
  },
  [ChainsIds.BASE]: {
    type: resolveBlockchainType(ChainsIds.BASE) || [BlockchainType.ON_CHAIN],
    gasPriceCheckBlocksInterval: resolveGasPriceInterval(ChainsIds.BASE),
    transactions: {
      useDefaultGasEstimation: resolveDefaultGasEstimation(ChainsIds.BASE),
      waitForBlockTime: 1000,
      minGasPrice: 100000000,
      minBalance: {
        warningLimit: '0.01',
        errorLimit: '0.0005',
      },
    },
  },
  [ChainsIds.MULTIVERSX]: {
    type: resolveBlockchainType(ChainsIds.MULTIVERSX) || [BlockchainType.ON_CHAIN],
    gasPriceCheckBlocksInterval: resolveGasPriceInterval(ChainsIds.MULTIVERSX),
    transactions: {
      useDefaultGasEstimation: resolveDefaultGasEstimation(ChainsIds.MULTIVERSX),
      waitForBlockTime: 1000,
      minGasPrice: 100000000,
      minBalance: {
        warningLimit: '0.1',
        errorLimit: '0.0015',
      },
    },
  },
  [ChainsIds.MASSA]: {
    type: resolveBlockchainType(ChainsIds.MASSA) || [BlockchainType.ON_CHAIN],
    gasPriceCheckBlocksInterval: resolveGasPriceInterval(ChainsIds.MASSA),
    transactions: {
      useDefaultGasEstimation: resolveDefaultGasEstimation(ChainsIds.MASSA),
      waitForBlockTime: 1000,
      minGasPrice: 100000000,
      minBalance: {
        warningLimit: '0.01',
        errorLimit: '0.0001',
      },
    },
  },
  [ChainsIds.CONCORDIUM]: {
    type: resolveBlockchainType(ChainsIds.CONCORDIUM) || [BlockchainType.ON_CHAIN],
    gasPriceCheckBlocksInterval: resolveGasPriceInterval(ChainsIds.CONCORDIUM),
    transactions: {
      useDefaultGasEstimation: resolveDefaultGasEstimation(ChainsIds.CONCORDIUM),
      waitForBlockTime: 1000,
      minGasPrice: 0,
      minBalance: {
        warningLimit: '250.00',
        errorLimit: '50.0',
      },
    },
  },
  [ChainsIds.AVAX_MELD]: {
    type: resolveBlockchainType(ChainsIds.AVAX_MELD) || [BlockchainType.ON_CHAIN],
    gasPriceCheckBlocksInterval: resolveGasPriceInterval(ChainsIds.AVAX_MELD),
    transactions: {
      useDefaultGasEstimation: resolveDefaultGasEstimation(ChainsIds.AVAX_MELD),
      waitForBlockTime: 1000,
      minGasPrice: 100000000,
      minBalance: {
        warningLimit: '0.5',
        errorLimit: '0.005',
      },
    },
  },
  [ChainsIds.XDC]: {
    type: resolveBlockchainType(ChainsIds.XDC) || [BlockchainType.ON_CHAIN],
    gasPriceCheckBlocksInterval: resolveGasPriceInterval(ChainsIds.XDC),
    transactions: {
      useDefaultGasEstimation: resolveDefaultGasEstimation(ChainsIds.XDC),
      waitForBlockTime: 1000,
      minGasPrice: 100000000,
      minBalance: {
        warningLimit: '0.5',
        errorLimit: '0.005',
      },
    },
  },
  [ChainsIds.OKX]: {
    type: resolveBlockchainType(ChainsIds.OKX) || [BlockchainType.ON_CHAIN],
    gasPriceCheckBlocksInterval: resolveGasPriceInterval(ChainsIds.OKX),
    transactions: {
      useDefaultGasEstimation: resolveDefaultGasEstimation(ChainsIds.OKX),
      waitForBlockTime: 1000,
      minGasPrice: 100000000,
      minBalance: {
        warningLimit: '0.5',
        errorLimit: '0.035',
      },
    },
  },
  [ChainsIds.ARTHERA]: {
    type: resolveBlockchainType(ChainsIds.ARTHERA) || [BlockchainType.ON_CHAIN],
    gasPriceCheckBlocksInterval: resolveGasPriceInterval(ChainsIds.ARTHERA),
    transactions: {
      useDefaultGasEstimation: resolveDefaultGasEstimation(ChainsIds.ARTHERA),
      waitForBlockTime: 1000,
      minGasPrice: 100000000,
      minBalance: {
        warningLimit: '0.5',
        errorLimit: '0.0008',
      },
    },
  },
  [ChainsIds.ASTAR]: {
    type: resolveBlockchainType(ChainsIds.ASTAR) || [BlockchainType.ON_CHAIN],
    gasPriceCheckBlocksInterval: resolveGasPriceInterval(ChainsIds.ASTAR),
    transactions: {
      useDefaultGasEstimation: resolveDefaultGasEstimation(ChainsIds.ASTAR),
      waitForBlockTime: 1000,
      minGasPrice: 100000000,
      minBalance: {
        warningLimit: '0.15',
        errorLimit: '0.0015',
      },
    },
  },
  [ChainsIds.ROOTSTOCK]: {
    type: resolveBlockchainType(ChainsIds.ROOTSTOCK) || [BlockchainType.ON_CHAIN],
    gasPriceCheckBlocksInterval: resolveGasPriceInterval(ChainsIds.ROOTSTOCK),
    transactions: {
      useDefaultGasEstimation: resolveDefaultGasEstimation(ChainsIds.ROOTSTOCK),
      waitForBlockTime: 1000,
      minGasPrice: 100000000,
      minBalance: {
        warningLimit: '0.001',
        errorLimit: '0.00005',
      },
    },
  },
  [ChainsIds.ZK_LINK_NOVA]: {
    type: resolveBlockchainType(ChainsIds.ZK_LINK_NOVA) || [BlockchainType.ON_CHAIN],
    gasPriceCheckBlocksInterval: resolveGasPriceInterval(ChainsIds.ZK_LINK_NOVA),
    transactions: {
      useDefaultGasEstimation: resolveDefaultGasEstimation(ChainsIds.ZK_LINK_NOVA),
      waitForBlockTime: 1000,
      minGasPrice: 100000000,
      minBalance: {
        warningLimit: '0.001',
        errorLimit: '0.00005',
      },
    },
  },
  [ChainsIds.BOB]: {
    type: resolveBlockchainType(ChainsIds.BOB) || [BlockchainType.ON_CHAIN],
    gasPriceCheckBlocksInterval: resolveGasPriceInterval(ChainsIds.BOB),
    transactions: {
      useDefaultGasEstimation: resolveDefaultGasEstimation(ChainsIds.BOB),
      waitForBlockTime: 1000,
      minGasPrice: 100_000_000,
      minBalance: {
        warningLimit: '0.01',
        errorLimit: '0.0005',
      },
    },
  },
  [ChainsIds._5IRE]: {
    type: resolveBlockchainType(ChainsIds._5IRE) || [BlockchainType.ON_CHAIN],
    gasPriceCheckBlocksInterval: resolveGasPriceInterval(ChainsIds._5IRE),
    transactions: {
      useDefaultGasEstimation: resolveDefaultGasEstimation(ChainsIds._5IRE),
      waitForBlockTime: 1000,
      minGasPrice: 100_000_000,
      minBalance: {
        warningLimit: '0.1',
        errorLimit: '0.05',
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
      releasesUrl:
        process.env.APPLICATION_RELEASE_UPDATE ??
        'https://raw.githubusercontent.com/umbrella-network/pegasus-feeds/main/prod/releases.json',
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
      interval: parseInt(process.env.METRICS_REPORTING_JOB_INTERVAL || '30000'),
      lock: {
        name: process.env.METRICS_REPORTING_LOCK_NAME || 'lock::MetricsReporting',
        ttl: parseInt(process.env.METRICS_REPORTING_LOCK_TTL || '60'),
      },
    },
    liquidities: {
      [ChainsIds.ETH]: {
        [DexProtocolName.UNISWAP_V3]: {
          interval: parseInt(process.env.ETHEREUM_UNISWAPV3_LIQUIDITY_JOB_INTERVAL || String(getDayInMillisecond(3))),
          lock: {
            name: process.env.ETHEREUM_UNISWAPV3_LIQUIDITY_LOCK_NAME || 'lock::EthereumUniswapV3Liquidity',
            ttl: parseInt(process.env.ETHEREUM_UNISWAPV3_LIQUIDITY_LOCK_TTL || '60'),
          },
        },
      },
      [ChainsIds.ROOTSTOCK]: {
        [DexProtocolName.UNISWAP_V3]: {
          interval: parseInt(process.env.ROOTSTOCK_UNISWAPV3_LIQUIDITY_JOB_INTERVAL || String(getDayInMillisecond(3))),
          lock: {
            name: process.env.ROOTSTOCK_UNISWAPV3_LIQUIDITY_LOCK_NAME || 'lock::RootstockUniswapV3Liquidity',
            ttl: parseInt(process.env.ROOTSTOCK_UNISWAPV3_LIQUIDITY_LOCK_TTL || '60'),
          },
        },
      },
    },
    blockchainMetrics: {
      interval: parseInt(process.env.VALIDATORS_RESOLVER_JOB_INTERVAL || '60000'),
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
    purgeDays: parseFloat(process.env.MONGODB_PURGE_DAYS || '0.5'),
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
      providerUrl: process.env.BLOCKCHAINS_ETHEREUM_PROVIDER_URL
        ? (<string>process.env.BLOCKCHAINS_ETHEREUM_PROVIDER_URL).split(',')
        : [],
    },
  },
  blockchain: {
    providers: resolveBlockchainProviders(),
    wallets: {
      evm: {
        privateKey: process.env.VALIDATOR_PRIVATE_KEY as string,
        deviationPrivateKey: process.env.DEVIATION_PRIVATE_KEY
          ? (process.env.DEVIATION_PRIVATE_KEY as string)
          : undefined,
      },
      multiversX: {
        privateKey: parseNl(process.env.MULTIVERSX_SIGNING_PRIVATE_KEY as string),
        deviationPrivateKey: process.env.MULTIVERSX_DEVIATION_PRIVATE_KEY
          ? parseNl(process.env.MULTIVERSX_DEVIATION_PRIVATE_KEY as string)
          : undefined,
      },
      massa: {
        privateKey: process.env.MASSA_SIGNING_PRIVATE_KEY as string,
        deviationPrivateKey: process.env.MASSA_SIGNING_PRIVATE_KEY
          ? (process.env.MASSA_SIGNING_PRIVATE_KEY as string)
          : undefined,
      },
      concordium: {
        privateKey: process.env.CONCORDIUM_SIGNING_PRIVATE_KEY || '',
        deviationPrivateKey: process.env.CONCORDIUM_DEVIATION_PRIVATE_KEY || undefined,
      },
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
      mintBalance: {
        warningLimit: process.env.BALANCE_WARN || '0.1',
        errorLimit: process.env.BALANCE_ERROR || '0.003',
      },
    },
    multiChains: resolveMultichainSettings(),
    resolveStatusTimeout: parseInt(process.env.RESOLVE_STATUS_TIMEOUT || '5000'),
  },
  api: {
    byBit: {
      timeout: timeoutWithCode(process.env.BYBIT_TIMEOUT || '5000', TimeoutCodes.BYBIT),
    },
    binance: {
      timeout: timeoutWithCode(process.env.BINANCE_TIMEOUT || '5000', TimeoutCodes.BINANCE),
      maxBatchSize: parseInt(process.env.BINANCE_MAX_BATCH_SIZE || '500', 10),
    },
    coingecko: {
      timeout: timeoutWithCode(process.env.COINGECKO_TIMEOUT || '5000', TimeoutCodes.COINGECKO),
      maxBatchSize: parseInt(process.env.COINGECKO_MAX_BATCH_SIZE || '250', 10),
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
    goldApi: {
      apiKey: process.env.GOLD_API_KEY as string,
      timeout: timeoutWithCode(process.env.GOLD_API_TIMEOUT || '5000', TimeoutCodes.GOLD_API),
    },
    metalPriceApi: {
      apiKey: process.env.METAL_PRICE_API_KEY || '',
      timeout: timeoutWithCode(process.env.METAL_PRICE_API_TIMEOUT || '5000', TimeoutCodes.METAL_PRICE_API),
    },
    metalsDevApi: {
      apiKey: process.env.METALS_DEV_API_KEY as string,
      timeout: timeoutWithCode(process.env.METALS_DEV_API_TIMEOUT || '5000', TimeoutCodes.METALS_DEV_API),
    },
    pools: {
      [ChainsIds.ETH]: {
        [DexProtocolName.UNISWAP_V3]: {
          helperContractAddress: <string>process.env.ETHEREUM_UNISWAPV3_HELPER_CONTRACT_ADDRESS,
        },
      },
    },
    priceFreshness: parseInt(process.env.PRICE_FRESHNESS || process.env.KAIKO_FRESHNESS || '3600', 10),
  },
  dexes: {
    [ChainsIds.ROOTSTOCK]: {
      [DexProtocolName.SOVRYN]: {
        subgraphUrl: <string>process.env['SOVRYN_SUBGRAPH_API'],
        liquidityFreshness: parseInt(process.env.SOVRYN_LIQUIDITY_FRESHNESS || String(getDayInMillisecond(365)), 10),
      },
      [DexProtocolName.UNISWAP_V3]: {
        subgraphUrl: <string>process.env['ROOTSTOCK_UNISWAPV3_SUBGRAPH_API'],
        liquidityFreshness: parseInt(
          process.env.ROOTSTOCK_UNISWAPV3_LIQUIDITY_FRESHNESS || String(getDayInMillisecond(10)),
          10,
        ),
      },
    },
    [ChainsIds.ETH]: {
      [DexProtocolName.UNISWAP_V3]: {
        subgraphUrl: <string>process.env['ETHEREUM_UNISWAPV3_SUBGRAPH_API'],
        liquidityFreshness: parseInt(
          process.env.ETHEREUM_UNISWAPV3_LIQUIDITY_FRESHNESS || String(getDayInMillisecond(365)),
          10,
        ),
      },
    },
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
  scheduler: {
    fetchers: {
      [FetcherName.BinancePrice]: schedulerFetcherSettings(FetcherName.BinancePrice),
      [FetcherName.ByBitPrice]: schedulerFetcherSettings(FetcherName.ByBitPrice),
      [FetcherName.CoingeckoPrice]: schedulerFetcherSettings(FetcherName.CoingeckoPrice),
      [FetcherName.GoldApiPrice]: schedulerFetcherSettings(FetcherName.GoldApiPrice),
      [FetcherName.KuCoinPrice]: schedulerFetcherSettings(FetcherName.KuCoinPrice),
      [FetcherName.MetalPriceApi]: schedulerFetcherSettings(FetcherName.MetalPriceApi),
      [FetcherName.MetalsDevApi]: schedulerFetcherSettings(FetcherName.MetalsDevApi),
      [FetcherName.MoCMeasurement]: schedulerFetcherSettings(FetcherName.MoCMeasurement),
      [FetcherName.PolygonIOCryptoSnapshotPrice]: schedulerFetcherSettings(FetcherName.PolygonIOCryptoSnapshotPrice),
      [FetcherName.PolygonIOCurrencySnapshotGrams]: schedulerFetcherSettings(
        FetcherName.PolygonIOCurrencySnapshotGrams,
      ),
      [FetcherName.PolygonIOSingleCryptoPrice]: schedulerFetcherSettings(FetcherName.PolygonIOSingleCryptoPrice),
      // [FetcherName.PolygonIOStockSnapshotPrice]: schedulerFetcherSettings(FetcherName.PolygonIOStockSnapshotPrice),
      [FetcherName.SovrynPrice]: schedulerFetcherSettings(FetcherName.SovrynPrice),
      [FetcherName.UniswapV3]: schedulerFetcherSettings(FetcherName.UniswapV3),
    },
  },
};

function schedulerFetcherSettings(fetcherName: FetcherName): SchedulerFetcherSettings {
  return {
    interval: getTimeSetting(parseInt(process.env[`${fetcherName}_JOB_INTERVAL`.toUpperCase()] || '15000'), 200),
    lock: {
      name: `lock::${fetcherName}Worker`,
      ttl: getTimeSetting(parseInt(process.env[`${fetcherName}_LOCK_TTL`.toUpperCase()] || '30'), 10),
    },
  };
}

function getTimeSetting(value: number, min: number): number {
  return value > min ? value : min;
}

function getDayInMillisecond(days: number): number {
  return days * 1000 * 60 * 60 * 24;
}

function resolveBlockchainProviders() {
  return resolveArray((i) => process.env[`BLOCKCHAIN_PROVIDER_${i}_URL`] as string).reduce(
    (map, item, i) => {
      const name = process.env[`BLOCKCHAIN_PROVIDER_${i}_NAME`] as string;
      if (name) {
        map[name] = item;
      }
      return map;
    },
    {} as {[name: string]: string},
  );
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
      providerUrl: clearLastSlash(process.env[`${chain}_BLOCKCHAIN_PROVIDER_URL`]),
      blockchainId: process.env[`${chain}_CHAIN_ID`],
      transactions: {
        useDefaultGasEstimation: !!process.env[`${chain}_USE_DEFAULT_GAS_ESTIMATION`],
        waitForBlockTime:
          parseInt(process.env[`${chain}_WAIT_FOR_BLOCK_TIME`] as string, 10) ||
          defaultByChain[ChainsIds[chain]].transactions.waitForBlockTime,
        minGasPrice:
          parseInt(process.env[`${chain}_MIN_GAS_PRICE`] as string, 10) ||
          defaultByChain[ChainsIds[chain]].transactions.minGasPrice,
        maxFeePerGas: process.env[`${chain}_MAX_FEE_PER_GAS`]
          ? parseInt(process.env[`${chain}_MAX_FEE_PER_GAS`] as string, 10)
          : undefined,
        maxPriorityFeePerGas: process.env[`${chain}_MAX_PRIORITY_FEE_PER_GAS`]
          ? parseInt(process.env[`${chain}_MAX_PRIORITY_FEE_PER_GAS`] as string, 10)
          : undefined,
        gasMultiplier: process.env[`${chain}_GAS_MULTIPLIER`]
          ? parseFloat(process.env[`${chain}_GAS_MULTIPLIER`] as string)
          : 1.0,
        minBalance: {
          warningLimit:
            process.env[`${chain}_BALANCE_WARN`] ||
            defaultByChain[ChainsIds[chain]].transactions.minBalance.warningLimit,
          errorLimit:
            process.env[`${chain}_BALANCE_ERROR`] ||
            defaultByChain[ChainsIds[chain]].transactions.minBalance.errorLimit,
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

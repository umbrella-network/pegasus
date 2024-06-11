import {ChainsIds} from './ChainsIds.js';
import {SubmitMonitor} from './SubmitMonitor.js';
import {DexProtocolName, DexAPISettings} from './Dexes.js';

export enum BlockchainType {
  LAYER2 = 'LAYER2',
  ON_CHAIN = 'ON_CHAIN',
}

export type BlockchainTypeKeys = keyof typeof BlockchainType;

export type BlockchainSettings = {
  providerUrl?: string;
  blockchainId?: string;
  contractRegistryAddress?: string;
  type: BlockchainType[];
  gasPriceCheckBlocksInterval?: number;
  transactions: {
    waitForBlockTime: number;
    minGasPrice: number;
    maxFeePerGas?: number;
    maxPriorityFeePerGas?: number;
    gasMultiplier?: number;
    minBalance: {
      warningLimit: string;
      errorLimit: string;
    };
  };
};

export type LiquidityWorker = {
  interval: number;
  lock: {
    name: string;
    ttl: number;
  };
};

export type DexPoolAPISettings = {
  helperContractAddress: string;
};

interface SubmitMonitorExt extends SubmitMonitor {
  date?: string;
}

export type BlockchainInfoSettings = {
  chainId: string;
  onChainId: string | number;
  providerUrl?: string;
  contractRegistryAddress?: string;
  chainAddress?: string;
  umbrellaFeedsAddress?: string;
  deviationWalletAddress?: string | undefined;
  walletAddress?: string;
  lastTx: SubmitMonitorExt | undefined;
};

export type BlockDispatcherSettings = {
  interval: number;
  deviationInterval: number;
};

type Settings = {
  port: number;
  application: {
    root: string;
    autoUpdate: {
      enabled: boolean;
      interval?: number;
      url?: string;
    };
  };
  jobs: {
    blockCreation: {
      interval: number;
      lock: {
        name: string;
        ttl: number;
      };
    };
    metricsReporting: {
      interval: number;
      lock: {
        name: string;
        ttl: number;
      };
    };
    liquidities: Partial<Record<ChainsIds, Partial<Record<DexProtocolName, LiquidityWorker>>>>;
    blockchainMetrics: {
      interval: number;
      lock: {
        name: string;
        ttl: number;
      };
    };
    blockDispatcher: Partial<Record<ChainsIds, BlockDispatcherSettings>>;
  };
  redis: {
    url: string;
    maxRetryTime: number;
  };
  mongodb: {
    url: string;
  };
  consensus: {
    retries: number;
    aggregator: string;
    strategy: string;
    discrepancyCutoff: number;
    roundInterval: number;
  };
  blockchains: {
    [key: string]: {
      providerUrl: string[];
    };
  };
  fetcherHistory: {
    ttl: number;
  };
  blockchain: {
    wallets: {
      evm: {
        privateKey: string;
        deviationPrivateKey?: string;
      };
      multiversX: {
        privateKey: string;
        deviationPrivateKey?: string;
      };
      massa: {
        privateKey: string;
        deviationPrivateKey?: string;
      };
      concordium: {
        privateKey: string;
        deviationPrivateKey?: string;
      };
    };
    providers: {[name: string]: string};
    contracts: {
      bank: {
        name: string;
      };
      chain: {
        name: string;
      };
      feeds: {
        name: string;
      };
      registry: {
        address: string;
      };
    };
    transactions: {
      waitForBlockTime: number;
      minGasPrice: number;
      mintBalance: {
        warningLimit: string;
        errorLimit: string;
      };
    };
    multiChains: Partial<Record<ChainsIds, BlockchainSettings>>;
    resolveStatusTimeout: number;
  };
  api: {
    cryptocompare: {
      apiKey: string;
      timeout: number;
      reconnectTimeoutHours: number;
      resubscribeTimeoutMinutes: number;
      truncateCronRule: string;
      truncateIntervalMinutes: number;
      reconnectTimeout: number;
    };
    coingecko: {
      timeout: number;
      maxBatchSize: number;
    };
    polygonIO: {
      apiKey: string;
      priceUpdateCronRule: string;
      truncateCronRule: string;
      truncateIntervalMinutes: number;
      timeout: number;
      reconnectTimeout: number;
      maxBatchSize: number;
    };
    optionsPrice: {
      apiKey: string;
      timeout: number;
    };
    debug: {
      apiKey: string;
    };
    uniswap: {
      active: boolean;
      scannerContractId: string;
      helperContractId: string;
      startBlock: number;
      agentStep: number;
      defaultPrecision: number;
      defaultDiscrepancy: number;
      verificationInterval: number;
    };
    goldApi: {
      apiKey: string;
      timeout: number;
    };
    metalPriceApi: {
      apiKey: string;
      timeout: number;
    };
    metalsDevApi: {
      apiKey: string;
      timeout: number;
    };
    pools: Partial<Record<ChainsIds, Partial<Record<DexProtocolName, DexPoolAPISettings>>>>;
    priceFreshness: number;
    liquidityFreshness: number;
  };
  dexes: Partial<Record<ChainsIds, Partial<Record<DexProtocolName, DexAPISettings>>>>;
  rpcSelectionStrategy: string;
  feedsCacheRefreshCronRule: string;
  statusCheckTimeout: number;
  signatureTimeout: number;
  dataTimestampOffsetSeconds: number;
  feedsFile: string;
  feedsOnChain: string;
  version: string;
  environment?: string;
  deviationTrigger: {
    roundLengthSeconds: number;
    leaderInterval: number;
    heartbeatRounds: number;
    lock: {
      name: string;
      ttl: number;
    };
    feedsFile: string;
  };
};

export default Settings;

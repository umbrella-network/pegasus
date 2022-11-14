import {ChainsIds} from './ChainsIds';

export type BlockchainSettings = {
  providerUrl?: string;
  contractRegistryAddress?: string;
  transactions: {
    waitForBlockTime: number;
    minGasPrice: number;
    maxGasPrice: number;
    mintBalance: {
      warningLimit: string;
      errorLimit: string;
    };
  };
};

export type BlockchainInfoSettings = {
  providerUrl?: string;
  contractRegistryAddress?: string;
};

export type BlockDispatcherSettings = {
  interval: number;
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
  blockchain: {
    provider: {
      urls: string[];
      privateKey: string;
    };
    masterChain: {
      chainId: ChainsIds;
    };
    providers: {[name: string]: string};
    contracts: {
      chain: {
        name: string;
      };
      registry: {
        address: string;
      };
    };
    transactions: {
      waitForBlockTime: number;
      minGasPrice: number;
      maxGasPrice: number;
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
      scannerContractId: string;
      helperContractId: string;
      startBlock: number;
      agentStep: number;
      defaultPrecision: number;
      defaultDiscrepancy: number;
      verificationInterval: number;
    };
    priceFreshness: number;
  };
  rpcSelectionStrategy: string;
  feedsCacheRefreshCronRule: string;
  statusCheckTimeout: number;
  signatureTimeout: number;
  dataTimestampOffsetSeconds: number;
  feedsFile: string;
  feedsOnChain: string;
  version: string;
  environment?: string;
  name: string;
};

export default Settings;

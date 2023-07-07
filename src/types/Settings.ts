import {ChainsIds} from './ChainsIds';
import {SubmitMonitor} from './SubmitMonitor';

export enum BlockchainType {
  LAYER2 = 'LAYER2',
  ON_CHAIN = 'ON_CHAIN',
}

export type BlockchainTypeKeys = keyof typeof BlockchainType;

export type BlockchainSettings = {
  providerUrl?: string;
  contractRegistryAddress?: string;
  type: BlockchainType[];
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
  chainId: string;
  providerUrl?: string;
  contractRegistryAddress?: string;
  lastTx: SubmitMonitor | undefined;
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
    validatorsResolver: {
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
      deviationPrivateKey?: string;
    };
    masterChain: {
      chainId: ChainsIds;
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

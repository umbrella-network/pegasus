type Settings = {
  port: number;
  application: {
    root: string;
    autoUpdate: {
      enabled: boolean;
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
    strategy: string;
    discrepancyCutoff: number;
  };
  blockchains: {
    [key: string]: {
      providerUrl: string[];
    };
  };
  blockchain: {
    provider: {
      url: string;
      privateKey: string;
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
    };
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
    coinmarketcap: {
      apiKey: string;
      timeout: number;
    };
    coingecko: {
      timeout: number;
    };
    genesisVolatility: {
      apiKey: string;
      timeout: number;
    };
    polygonIO: {
      apiKey: string;
      priceUpdateCronRule: string;
      truncateCronRule: string;
      truncateIntervalMinutes: number;
      timeout: number;
      reconnectTimeout: number;
    };
    bea: {
      apiKey: string;
      timeout: number;
    };
    iex: {
      apiKey: string;
      timeout: number;
    };
    kaiko: {
      apiKey: string;
      rpcUrl: string;
      timeout: number;
      priceFreshness: number;
    };
    optionsPrice: {
      apiKey: string;
      timeout: number;
    };
    uniswap: {
      scannerContractId: string;
      helperContractId: string;
      startBlock: number;
      agentStep: number;
      defaultPrecision: number;
      defaultDiscrepancy: number;
    };
  };
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

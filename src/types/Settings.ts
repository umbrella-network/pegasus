type Settings = {
  port: number;
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

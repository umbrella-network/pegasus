type Settings = {
  port: number;
  jobs: {
    blockCreation: {
      interval: number;
    };
  };
  redis: {
    url: string;
  };
  mongodb: {
    url: string;
  };
  consensus: {
    retries: number;
  };
  blockchain: {
    provider: {
      url: string;
      privateKey: string;
    };
    contracts: {
      chain: {
        name: string;
      };
      registry: {
        address: string;
      };
      validatorRegistry: {
        name: string;
      };
    };
    transactions: {
      gasPrice: number;
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
    };
    iex: {
      apiKey: string;
      timeout: number;
    };
  };
  signatureTimeout: number;
  dataTimestampOffsetSeconds: number;
  feedsFile: string;
  feedsOnChain: string;
  version: string;
  environment?: string;
  name: string;
};

export default Settings;

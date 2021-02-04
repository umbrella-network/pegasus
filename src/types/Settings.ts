type Settings = {
  port: number,
  jobs: {
    blockCreation: {
      interval: number
    }
  },
  redis: {
    url: string
  },
  mongodb: {
    url: string
  },
  blockchain: {
    provider: {
      url: string,
      account?: string,
      privateKey: string
    },
    contracts: {
      chain: {
        name: string
      },
      registry: {
        address: string
      },
      validatorRegistry: {
        name: string
      },
    },
    transactions: {
      gasPrice: number
    }
  },
  api: {
    cryptocompare: {
      apiKey: string,
      timeout: number,
    },
    genesisVolatility: {
      apiKey: string,
      timeout: number,
    }
    polygonIO: {
      apiKey: string,
      timeout: number,
    },
    iex: {
      apiKey: string,
      timeout: number,
    },
  },
  feedsFile: string,
  feedsOnChain: string,
}

export default Settings;

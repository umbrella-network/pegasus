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
        address: string
      }
    },
    transactions: {
      gasPrice: number
    }
  }
}

export default Settings;

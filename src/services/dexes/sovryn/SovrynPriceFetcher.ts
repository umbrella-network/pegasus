export interface Pair {
  inputTokenAddress: string;
  outputTokenAddress: string;
  amount: string;
}

export interface Prices {
  values: string[];
  timestamp: string;
}

export abstract class SovrynConnectionBase {
  blockchainNodeUrl: string;
  sovrynHelperContractAddress: string;

  constructor(blockchainNodeUrl: string, sovrynHelperContractAddress: string) {
    this.blockchainNodeUrl = blockchainNodeUrl;
    this.sovrynHelperContractAddress = sovrynHelperContractAddress;
  }

  abstract getPrices(pairs: Pair[]): Prices;
}

export abstract class SovrynPriceFetcherBase {
  sovrynConnection!: SovrynConnectionBase;
  constructor(sovrynConnection: SovrynConnectionBase) {
    this.sovrynConnection = sovrynConnection;
  }
  abstract getPrices(pairs: Pair[]): Promise<Prices>;
}

export class SovrynPriceFetcher extends SovrynPriceFetcherBase {
  constructor(sovrynConnection: SovrynConnectionBase) {
    super(sovrynConnection);
  }

  async getPrices(pairs: Pair[]): Promise<Prices> {
    const prices = await this.sovrynConnection.getPrices(pairs);

    return prices;
  }
}

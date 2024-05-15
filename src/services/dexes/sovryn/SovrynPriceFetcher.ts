import {PricesResponse, PairRequest, SovrynHelperBase} from '../../../blockchains/evm/contracts/SovrynHelper.js';

export abstract class SovrynPriceFetcherBase {
  sovrynConnection!: SovrynHelperBase;
  constructor(sovrynConnection: SovrynHelperBase) {
    this.sovrynConnection = sovrynConnection;
  }
  abstract getPrices(pairs: PairRequest[]): Promise<PricesResponse>;
}

export class SovrynPriceFetcher extends SovrynPriceFetcherBase {
  constructor(sovrynConnection: SovrynHelperBase) {
    super(sovrynConnection);
  }

  async getPrices(pairs: PairRequest[]): Promise<PricesResponse> {
    const prices = await this.sovrynConnection.getPrices(pairs);

    return prices;
  }
}

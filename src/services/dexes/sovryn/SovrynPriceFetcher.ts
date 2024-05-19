import {injectable} from 'inversify';
import {PricesResponse, PairRequest, SovrynFetcherHelperBase} from './SovrynFetcherHelper.js';
import {FeedFetcherInterface} from 'src/types/fetchers.js';

/*
For getting the prices of different Sovryn pools the `pairs` argument of
targetPrices(pairs) should have the following structure:

const pairs = [
    {
        base: "0x<address_of_base_token_contract>"
        quote: "0x<address_of_quote_token_contract>"
        amount: "amount of base token that would be used as trade input"
    },
    ...
]

The output would have the following structure:

prices = [
    {
        price: {
            price: BigInt
            success: <true: the pair exists | false: the pair doesn't exist>
        },
        timestamp
    },
    ...
]
*/
@injectable()
export class SovrynPriceFetcher implements FeedFetcherInterface {
  sovrynConnection!: SovrynFetcherHelperBase;

  constructor(sovrynConnection: SovrynFetcherHelperBase) {
    this.sovrynConnection = sovrynConnection;
  }

  async getPrices(pairs: PairRequest[]): Promise<PricesResponse> {
    return await this.sovrynConnection.getPrices(pairs);
  }

  async apply(pairs: PairRequest[]): Promise<number[]> {
    const prices = this.getPrices(pairs);
    return (await prices).prices.map((price) => price.price.toNumber());
  }
}

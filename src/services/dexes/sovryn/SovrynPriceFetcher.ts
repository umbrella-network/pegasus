import {injectable} from 'inversify';
import {PricesResponse, PairRequest, SovrynFetcherHelper, SovrynFetcherHelperBase} from './SovrynFetcherHelper.js';
import {FeedFetcherInterface} from 'src/types/fetchers.js';

/*
For getting the prices of different of a Sovryn pool the `base` (input token)
and `quote` (output token), and the `amount` of the input token should be provided.

weBTC-rUSDT:
  discrepancy: 1
  precision: 2
  inputs:
    - fetcher:
        name: SovrynPriceFetcher
        params:
          base: '0x69fe5cec81d5ef92600c1a0db1f11986ab3758ab'
          quote: '0xcb46c0ddc60d18efeb0e586c17af6ea36452dae0'
          quoteDecimals: 8
          amount: "1000"
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

  async apply(pair: PairRequest): Promise<number> {
    const sovrynHelperAddress = '0xbc758fcb97e06ec635dff698f55e41acc35e1d2d';
    const testnetNodeUrl = 'https://public-node.testnet.rsk.co/';
    const sovrynConnection = new SovrynFetcherHelper(sovrynHelperAddress, testnetNodeUrl);

    pair.amount = Number(pair.amount);
    const prices = await sovrynConnection.getPrices([pair]);

    const bigIntPrice = prices.prices[0].price.toBigInt();

    return BigIntToFloatingPoint(bigIntPrice, pair.quoteDecimals);
  }
}

export const BigIntToFloatingPoint = (integerValue: bigint, decimals: number): number => {
  const stringValue = integerValue.toString();

  let intPart = '';
  let decPart = '';
  const lengthDiff = stringValue.length - decimals;
  if (lengthDiff > 0) {
    intPart = stringValue.substring(0, lengthDiff);
    decPart = stringValue.substring(lengthDiff);
  } else {
    intPart = '0';
    decPart = '0'.repeat(-lengthDiff) + stringValue;
  }

  return Number(intPart + '.' + decPart);
};

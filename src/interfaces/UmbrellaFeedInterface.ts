import {PayableOverrides} from '@ethersproject/contracts';

import {PriceData, PriceDataWithKey, UmbrellaFeedsUpdateArgs} from '../types/DeviationFeeds.js';
import {ExecutedTx} from '../types/Consensus.js';

export interface UmbrellaFeedInterface {
  address(): Promise<string>;
  update(args: UmbrellaFeedsUpdateArgs, payableOverrides?: PayableOverrides): Promise<ExecutedTx>;
  getManyPriceDataRaw(keys: string[]): Promise<PriceDataWithKey[] | undefined>;
  requiredSignatures(): Promise<number>;
  resolveAddress(): Promise<string>;
  hashData(bytes32Keys: string[], priceDatas: PriceData[]): Promise<string>;
}

import {PriceData} from '../../../types/DeviationFeeds.js';
import {ChainsIds} from '../../../types/ChainsIds.js';

export interface DeviationHasherInterface {
  apply(chainId: ChainsIds, networkId: number, target: string, keys: string[], priceDatas: PriceData[]): string;
}

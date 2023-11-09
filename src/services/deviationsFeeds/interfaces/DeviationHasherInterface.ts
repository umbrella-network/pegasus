import {PriceData} from '../../../types/DeviationFeeds';
import {ChainsIds} from '../../../types/ChainsIds';

export interface DeviationHasherInterface {
  apply(chainId: ChainsIds, networkId: number, target: string, keys: string[], priceDatas: PriceData[]): string;
}

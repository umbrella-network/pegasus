import {injectable} from 'inversify';

import {PriceData} from '../../types/DeviationFeeds.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import {DeviationHasherMultiversX} from '../../blockchains/multiversx/DeviationHasherMultiversX.js';
import {DeviationHasherEvm} from '../../blockchains/evm/DeviationHasherEvm.js';
import {DeviationHasherInterface} from './interfaces/DeviationHasherInterface.js';

@injectable()
export class DeviationHasher implements DeviationHasherInterface {
  apply(chainId: ChainsIds, networkId: number, target: string, keys: string[], priceDatas: PriceData[]): string {
    switch (chainId) {
      case ChainsIds.MULTIVERSX:
        return DeviationHasherMultiversX.apply(networkId, target, keys, priceDatas);

      case ChainsIds.BSC:
      case ChainsIds.AVALANCHE:
      case ChainsIds.ARBITRUM:
      case ChainsIds.POLYGON:
      case ChainsIds.ETH:
      case ChainsIds.LINEA:
      case ChainsIds.BASE:
        return DeviationHasherEvm.apply(networkId, target, keys, priceDatas);

      default:
        throw new Error(`[DeviationHasher] ${chainId} not supported`);
    }
  }
}

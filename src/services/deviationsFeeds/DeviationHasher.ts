import {injectable} from 'inversify';

import {PriceData} from '../../types/DeviationFeeds.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import {DeviationHasherMultiversX} from '../../blockchains/multiversx/DeviationHasherMultiversX.js';
import {DeviationHasherEvm} from '../../blockchains/evm/DeviationHasherEvm.js';
import {DeviationHasherInterface} from './interfaces/DeviationHasherInterface.js';
import {DeviationHasherMassa} from '../../blockchains/massa/DeviationHasherMassa.js';
import {DeviationHasherConcordium} from '../../blockchains/concordium/DeviationHasherConcordium.js';
import {FeedName} from '../../types/Feed';

@injectable()
export class DeviationHasher implements DeviationHasherInterface {
  apply(chainId: ChainsIds, networkId: number, target: string, names: FeedName[], priceDatas: PriceData[]): string {
    switch (chainId) {
      case ChainsIds.MULTIVERSX:
        return DeviationHasherMultiversX.apply(networkId, target, names, priceDatas);

      case ChainsIds.MASSA:
        return DeviationHasherMassa.apply(networkId, target, names, priceDatas);

      case ChainsIds.CONCORDIUM:
        return DeviationHasherConcordium.apply(networkId, target, names, priceDatas);

      case ChainsIds.BSC:
      case ChainsIds.AVALANCHE:
      case ChainsIds.ARBITRUM:
      case ChainsIds.POLYGON:
      case ChainsIds.ETH:
      case ChainsIds.LINEA:
      case ChainsIds.BASE:
      case ChainsIds.AVAX_MELD:
        return DeviationHasherEvm.apply(networkId, target, names, priceDatas);

      default:
        throw new Error(`[DeviationHasher] ${chainId} not supported`);
    }
  }
}

import Blockchain from '../../lib/Blockchain';
import settings from '../../config/settings';
import {ChainsIds} from '../../types/ChainsIds';
import {UmbrellaFeedInterface} from '../../interfaces/UmbrellaFeedInterface';
import {FeedContract} from '../../blockchains/evm/contracts/FeedContract';
import {UmbrellaFeedsMultiversX} from '../../blockchains/multiversx/contracts/UmbrellaFeedsMultiversX';
import {UmbrellaFeedsMassa} from '../../blockchains/massa/contracts/UmbrellaFeedsMassa';

export class UmbrellaFeedsContractFactory {
  static create(blockchain: Blockchain): UmbrellaFeedInterface {
    switch (blockchain.chainId) {
      case ChainsIds.MULTIVERSX:
        return new UmbrellaFeedsMultiversX(blockchain);

      case ChainsIds.MASSA:
        return new UmbrellaFeedsMassa(blockchain);

      case ChainsIds.BSC:
      case ChainsIds.AVALANCHE:
      case ChainsIds.ARBITRUM:
      case ChainsIds.POLYGON:
      case ChainsIds.ETH:
      case ChainsIds.LINEA:
      case ChainsIds.BASE:
        return new FeedContract(settings, blockchain);

      default:
        throw new Error(`[UmbrellaFeedsContractFactory] ${blockchain.chainId} not supported`);
    }
  }
}

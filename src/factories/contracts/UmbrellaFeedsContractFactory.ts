import Blockchain from '../../lib/Blockchain.js';
import settings from '../../config/settings.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import {UmbrellaFeedInterface} from '../../interfaces/UmbrellaFeedInterface.js';
import {FeedContract} from '../../blockchains/evm/contracts/FeedContract.js';
import {UmbrellaFeedsMultiversX} from '../../blockchains/multiversx/contracts/UmbrellaFeedsMultiversX.js';
import {UmbrellaFeedsMassa} from '../../blockchains/massa/contracts/UmbrellaFeedsMassa.js';
import {UmbrellaFeedsConcordium} from '../../blockchains/concordium/contracts/UmbrellaFeedsConcordium.js';

export class UmbrellaFeedsContractFactory {
  static create(blockchain: Blockchain): UmbrellaFeedInterface {
    if (!blockchain) throw new Error('[UmbrellaFeedsContractFactory] empty blockchain');

    switch (blockchain.chainId) {
      case ChainsIds.MULTIVERSX:
        return new UmbrellaFeedsMultiversX(blockchain);

      case ChainsIds.MASSA:
        return new UmbrellaFeedsMassa(blockchain);

      case ChainsIds.CONCORDIUM:
        return new UmbrellaFeedsConcordium(blockchain);

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

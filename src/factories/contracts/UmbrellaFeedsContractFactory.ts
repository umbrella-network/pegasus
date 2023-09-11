import Blockchain from "../../lib/Blockchain";
import settings from "../../config/settings";
import {ChainsIds} from "../../types/ChainsIds";
import {UmbrellaFeedInterface} from "../../contracts/interfaces/UmbrellaFeedInterface";
import {FeedContract} from "../../contracts/evm/FeedContract";
import {UmbrellaFeedsMultiversX} from "../../contracts/multiversx/UmbrellaFeedsMultiversX";

export class UmbrellaFeedsContractFactory {
  static create(blockchain: Blockchain): UmbrellaFeedInterface {
    switch (blockchain.chainId) {
      case ChainsIds.MULTIVERSX:
        return new UmbrellaFeedsMultiversX(blockchain);

      default:
        return new FeedContract(settings, blockchain);

    }
  }
}

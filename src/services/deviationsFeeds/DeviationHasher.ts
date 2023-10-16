import {injectable} from 'inversify';

import {PriceData} from "../../types/DeviationFeeds";
import {ChainsIds} from "../../types/ChainsIds";
import {DeviationHasherMultiversX} from "../../blockchains/multiversx/DeviationHasherMultiversX";
import {DeviationHasherEvm} from "../../blockchains/evm/DeviationHasherEvm";
import {DeviationHasherInterface} from "./interfaces/DeviationHasherInterface";
import {DeviationHasherMassa} from "../../blockchains/massa/DeviationHasherMassa";

@injectable()
export class DeviationHasher implements DeviationHasherInterface {
  apply(chainId: ChainsIds, networkId: number, target: string, keys: string[], priceDatas: PriceData[]): string {
    switch (chainId) {
      case ChainsIds.MULTIVERSX:
        return DeviationHasherMultiversX.apply(networkId, target, keys, priceDatas);

      case ChainsIds.MASSA:
        return DeviationHasherMassa.apply(networkId, target, keys, priceDatas);

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

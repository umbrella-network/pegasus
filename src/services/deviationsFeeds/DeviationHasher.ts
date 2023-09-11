import {injectable} from 'inversify';

import {PriceData} from "../../types/DeviationFeeds";
import {ChainsIds} from "../../types/ChainsIds";
import {DeviationHasherMultiversX} from "./multiversX/DeviationHasherMultiversX";
import {DeviationHasherEvm} from "./evm/DeviationHasherEvm";
import {DeviationHasherInterface} from "./interfaces/DeviationHasherInterface";

@injectable()
export class DeviationHasher implements DeviationHasherInterface {
  apply(chainId: ChainsIds, networkId: number, target: string, keys: string[], priceDatas: PriceData[]): string {
    switch (chainId) {
      case ChainsIds.MULTIVERSX:
        return DeviationHasherMultiversX.apply(networkId, target, keys, priceDatas);

      default:
        return DeviationHasherEvm.apply(networkId, target, keys, priceDatas);
    }
  }
}

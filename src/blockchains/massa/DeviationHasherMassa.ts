import { injectable} from 'inversify';
import {ethers} from "ethers";
import {Args} from "@massalabs/massa-web3";

import {PriceData} from "../../types/DeviationFeeds";
import {MassaWBytesSerializer} from "./utils/MassaWBytesSerializer";
import {MassaPriceDataSerializer} from "./utils/MassaPriceDataSerializer";

@injectable()
export class DeviationHasherMassa {
  static apply(chainId: number, target: string, priceKeysRaw: string[], priceDatas: PriceData[]): string {
    if (target == '') throw new Error(`[DeviationHasherMassa] empty target`);
    if (chainId == 0) throw new Error(`[DeviationHasherMassa] empty chainId`);

    // Until Massa Issue #4388 is fixed, need to encode to base64
    const toHash = new Args()
      .addU256(BigInt(chainId))
      .addString(target)
      .addSerializableObjectArray(priceKeysRaw.map(key => new MassaWBytesSerializer(ethers.utils.id(key))))
      .addSerializableObjectArray(priceDatas.map(data => new MassaPriceDataSerializer(data.data, data.heartbeat, data.timestamp, data.price)));

    return ethers.utils.keccak256(toHash.serialize());
  }
}

import { injectable} from 'inversify';
import {ethers} from "ethers";
import {Address} from "@multiversx/sdk-core";

import {PriceData} from "../../types/DeviationFeeds";
import {NumberToBuffer} from "./utils/NumberToBuffer";


@injectable()
export class DeviationHasherMultiversX {
  static apply(_: number, target: string, priceKeysRaw: string[], priceDatas: PriceData[]): string {
    const priceKeys = priceKeysRaw.map(k => Buffer.from(ethers.utils.id(k).slice(2), 'hex'));
    const contractAddress = Address.fromBech32(target).pubkey();

    const dataList = [
      contractAddress,

      // price_keys
      ...priceKeys,

      // price_datas
      // this line: codec.encodeNested(new U32Value(0)) produces: <Buffer 00 00 00 00> instead of <Buffer 00>
      // to force additional bytes, this is why we are using `32` for NumberToBuffer.apply on heartbeat and timestamp
      ...priceDatas.map(priceData => [
        NumberToBuffer.apply(priceData.heartbeat, 32),
        NumberToBuffer.apply(priceData.timestamp, 32),
        NumberToBuffer.apply(BigInt(priceData.price)),
      ]).flat(),
    ];

    // get_price_data_hash
    const data = Buffer.concat(dataList);

    return ethers.utils.keccak256(data);
  }
}

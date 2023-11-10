import {Args, IDeserializedResult, ISerializable} from '@massalabs/massa-web3';

import {PriceData} from '../../../types/DeviationFeeds.js';

export class MassaPriceDataSerializer implements ISerializable<MassaPriceDataSerializer> {
  private data: number; // u8
  private heartbeat: number; // u32
  private timestamp: number; // u32
  private price: bigint; // u128

  constructor(data = 0, heartbeat = 0, timestamp = 0, price = BigInt(0)) {
    this.data = data;
    this.heartbeat = heartbeat;
    this.timestamp = timestamp;
    this.price = price;
  }

  serialize(): Uint8Array {
    const args = new Args().addU8(this.data).addU32(this.heartbeat).addU32(this.timestamp).addU128(this.price);

    return new Uint8Array(args.serialize());
  }

  deserialize(data: Uint8Array, offset: number): IDeserializedResult<MassaPriceDataSerializer> {
    const args = new Args(data, offset);
    this.data = Number(args.nextU8());
    this.heartbeat = args.nextU32();
    this.timestamp = args.nextU32();
    this.price = args.nextU128();
    return {instance: this, offset: args.getOffset()};
  }

  get(): PriceData {
    return {
      data: this.data,
      heartbeat: this.heartbeat,
      timestamp: this.timestamp,
      price: this.price,
    };
  }
}

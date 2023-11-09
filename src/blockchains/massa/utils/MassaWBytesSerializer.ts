import {Args, ISerializable, IDeserializedResult} from '@massalabs/massa-web3';

export class MassaWBytesSerializer implements ISerializable<MassaWBytesSerializer> {
  private arr: Uint8Array = new Uint8Array(0);

  constructor(bytes32: string) {
    this.arr = Buffer.from(bytes32.replace('0x', ''), 'hex');
  }

  serialize(): Uint8Array {
    const args = new Args().addUint8Array(this.arr);
    return new Uint8Array(args.serialize());
  }

  deserialize(data: Uint8Array, offset: number): IDeserializedResult<MassaWBytesSerializer> {
    const args = new Args(data, offset);
    this.arr = args.nextUint8Array();
    return {instance: this, offset: args.getOffset()};
  }
}

import {IAddress, Address, AddressValue} from '@multiversx/sdk-core';

export class MultiversXAddress {
  static toAddressValue(erdAddress: string): AddressValue {
    if (!erdAddress.startsWith('erd')) {
      throw new Error(`[MultiversXAddress] toAddressValue expect erd format, got ${erdAddress}`);
    }

    return new AddressValue(new Address(erdAddress));
  }

  static fromAddressValue(addr: AddressValue): string {
    return addr.valueOf().bech32();
  }

  static fromHex(hex: string): IAddress {
    return Address.fromHex(hex);
  }

  static toErd(addr: IAddress): string {
    return addr.bech32();
  }

  static toBuffer(erdAddress: string): Buffer {
    if (!erdAddress.startsWith('erd')) {
      throw new Error(`[MultiversXAddress] toAddressValue expect erd format, got ${erdAddress}`);
    }

    return Buffer.from(new Address(erdAddress).hex(), 'hex');
  }

  static sort(erd1: string, erd2: string): number {
    const a = BigInt(`0x${MultiversXAddress.toBuffer(erd1).toString('hex')}`);
    const b = BigInt(`0x${MultiversXAddress.toBuffer(erd2).toString('hex')}`);
    if (a == b) return 0;

    return a < b ? -1 : 1;
  }
}

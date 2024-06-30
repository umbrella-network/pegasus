import * as SDK from '@concordium/web-sdk';

export class ConcordiumAddress {
  static fromIndexedString(str: string): SDK.ContractAddress.Type {
    if (!str) return SDK.ContractAddress.create(0n, 0n);

    const [index, subindex] = str.split(',');
    return SDK.ContractAddress.create(BigInt(index), BigInt(subindex));
  }

  static toIndexedString(addr: SDK.ContractAddress.Type): string {
    return `${addr.index},${addr.subindex}`;
  }

  static fromBase58toHex(/* addr: SDK.Base58String */): SDK.HexString {
    throw new Error('fromBase58toHex not supported');
    // return `${Buffer.from(SDK.AccountAddress.fromBase58(addr).decodedAddress).toString('hex')}`;
  }

  static fromHexToBase58(addr: SDK.HexString): SDK.Base58String {
    return `${SDK.AccountAddress.fromBuffer(Buffer.from(addr, 'hex')).address}`;
  }

  static toBigInt(addr: SDK.HexString): bigint {
    return BigInt(`0x${addr}`);
  }

  static sort(addr1: SDK.HexString, addr2: SDK.HexString): number {
    const a = this.toBigInt(addr1);
    const b = this.toBigInt(addr2);
    if (a == b) return 0;

    return a < b ? -1 : 1;
  }
}

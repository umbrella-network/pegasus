import bs58 from 'bs58';

export class MassaAddress {
  static toHex(addr: string): string {
    // Remove 'P'
    const base58WithChecksum = bs58.decode(addr.slice(1));
    // Remove version (0) and b58 checksum (at the end)
    const base58 = Buffer.from(base58WithChecksum.slice(1, -4));
    return '0x' + base58.toString('hex');
  }

  static sort(addr1: string, addr2: string): number {
    const a = BigInt(MassaAddress.toHex(addr1));
    const b = BigInt(MassaAddress.toHex(addr2));

    if (a == b) return 0;

    return a < b ? -1 : 1;
  }
}

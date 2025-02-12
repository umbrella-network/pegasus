import bs58 from 'bs58';

type U256 = {
  lo1: bigint;
  lo2: bigint;
  hi1: bigint;
  hi2: bigint;
};

export class MassaAddress {
  static toHex(addr: string): string {
    // Remove 'P'
    const base58WithChecksum = bs58.decodeUnsafe(addr.slice(1));
    if (!base58WithChecksum) throw new Error(`bs58.decodeUnsafe ERROR for ${addr}`);

    // Remove version (0) and b58 checksum (at the end)
    const base58 = Buffer.from(base58WithChecksum.slice(1, base58WithChecksum.length - 4));
    return '0x' + base58.toString('hex');
  }

  // node_modules/as-bignum/assembly/integer/u256.ts
  static lt(a: U256, b: U256): boolean {
    const ah2 = a.hi2,
      ah1 = a.hi1,
      bh2 = b.hi2,
      bh1 = b.hi1,
      al2 = a.lo2,
      bl2 = b.lo2;

    if (ah2 == bh2) {
      if (ah1 == bh1) {
        return al2 == bl2 ? a.lo1 < b.lo1 : al2 < bl2;
      } else {
        return ah1 < bh1;
      }
    } else {
      return ah2 < bh2;
    }
  }

  static toU256(addr: string): U256 {
    // Remove 'P'
    const base58WithChecksum = bs58.decodeUnsafe(addr.slice(1));
    if (!base58WithChecksum) throw new Error(`bs58.decodeUnsafe ERROR for ${addr}`);

    // Remove version (0) and b58 checksum (at the end)
    const pkb32 = base58WithChecksum.slice(1, base58WithChecksum.length - 4);

    return {
      hi2: BigInt('0x' + Buffer.from(pkb32.slice(0, 8)).toString('hex')),
      hi1: BigInt('0x' + Buffer.from(pkb32.slice(8, 16)).toString('hex')),
      lo2: BigInt('0x' + Buffer.from(pkb32.slice(16, 24)).toString('hex')),
      lo1: BigInt('0x' + Buffer.from(pkb32.slice(24, 32)).toString('hex')),
    };
  }

  // based on contract implementation
  static sortSmartContractWay(addr1: string, addr2: string): number {
    const a = MassaAddress.toU256(addr1);
    const b = MassaAddress.toU256(addr2);

    return MassaAddress.lt(a, b) ? -1 : 1;
  }

  // original one - does not work
  static sort(addr1: string, addr2: string): number {
    const a = BigInt(MassaAddress.toHex(addr1));
    const b = BigInt(MassaAddress.toHex(addr2));

    if (a == b) return 0;

    return a < b ? -1 : 1;
  }
}

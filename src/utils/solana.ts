import {Keypair, PublicKey} from '@solana/web3.js';
import {utils} from '@project-serum/anchor';
import {LeafKeyCoder, LeafValueCoder} from '@umb-network/toolbox';

// =====================================================================================================================
//  deriving addresses
// =====================================================================================================================

export async function derivePDAFromBlockId(blockId: number, programId: PublicKey): Promise<[PublicKey, Buffer]> {
  const seed: Buffer = LeafValueCoder.encode(blockId, '');

  const [publicKey] = await derivePDAFromSeed(seed, programId);

  return [publicKey, seed];
}

export async function derivePDAFromFCDKey(key: string, programId: PublicKey): Promise<[PublicKey, Buffer]> {
  const seed: Buffer = LeafKeyCoder.encode(key);

  const [publicKey] = await derivePDAFromSeed(seed, programId);

  return [publicKey, seed];
}

export function derivePDAFromSeed(seed: Buffer, programId: PublicKey): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddress([seed], programId);
}

// =====================================================================================================================
//  encoding / decoding
// =====================================================================================================================

export function encodeBlockRoot(root: string): Buffer {
  return LeafValueCoder.encode(root, 'FIXED_');
}

export function decodeBlockRoot(encodedRoot: number[]): string {
  return prepend0x(Buffer.from(encodedRoot).toString('hex'));
}

export function encodeDataValue(value: string | number, key: string): Buffer {
  return LeafValueCoder.encode(value, key);
}

export function decodeDataValue(encodedValue: number[], key: string): number | string {
  return LeafValueCoder.decode(prepend0x(Buffer.from(encodedValue).toString('hex')), key);
}

export async function getPublicKeyForSeed(seed: string, programId: PublicKey): Promise<PublicKey> {
  const [publicKey] = await PublicKey.findProgramAddress([utils.bytes.utf8.encode(seed)], programId);

  return publicKey;
}

export async function getPublicKeyForString(seed: string, programId: PublicKey): Promise<[PublicKey, Buffer]> {
  const bufSeed: Buffer = LeafKeyCoder.encode(seed);

  const [publicKey] = await derivePDAFromSeed(bufSeed, programId);

  return [publicKey, bufSeed];
}

export function getKeyPairFromSecretKeyString(secretKey: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secretKey)));
}

export const prepend0x = (v: string): string => (['0X', '0x'].includes(v.slice(0, 2)) ? v : `0x${v ? v : '0'}`);

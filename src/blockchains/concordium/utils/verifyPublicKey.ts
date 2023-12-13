import * as ed25519 from '@noble/ed25519';

export async function verifyPublicKey(pk: string, publicKey: string, errorPrefix: string): Promise<void> {
  const extractedPub = Buffer.from(await ed25519.getPublicKeyAsync(Buffer.from(pk, 'hex')))
    .toString('hex')
    .toLowerCase();

  if (extractedPub != publicKey.toLowerCase()) {
    const pkPreview = `${pk.slice(0, 1)}..(${pk.length})..${pk.slice(-1)}`;
    throw new Error(`[${errorPrefix}] public keys ${extractedPub}!=${publicKey} does not match, PK ${pkPreview}`);
  }
}

// Evm chainid spec:
// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1344.md
import {ethers} from 'ethers';

export function generateChainId(chainName: string): number {
  const utf8Encoded = Buffer.from(chainName, 'utf-8');
  const keccakHash = ethers.utils.keccak256(utf8Encoded);

  return parseInt(keccakHash.slice(0, 10), 16);
}

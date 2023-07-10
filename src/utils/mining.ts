import {ethers, Wallet} from 'ethers';
import sort from 'fast-sort';
import {LeafKeyCoder} from '@umb-network/toolbox';
import {remove0x} from '@umb-network/toolbox/dist/utils/helpers';

import Leaf from '../types/Leaf';
import {ChainStatus} from '../types/ChainStatus';

export const timestamp = (): number => Math.trunc(Date.now() / 1000);

const abiUintEncoder = (n: number | string, bits = 256): string =>
  (typeof n === 'number' ? n.toString(16) : remove0x(n)).padStart(bits / 4, '0');

export const recoverSigner = (affidavit: string, signature: string): string => {
  const pubKey = ethers.utils.recoverPublicKey(
    ethers.utils.solidityKeccak256(
      ['string', 'bytes32'],
      ['\x19Ethereum Signed Message:\n32', ethers.utils.arrayify(affidavit)],
    ),
    signature,
  );

  return ethers.utils.computeAddress(pubKey).toLowerCase();
};

export const signAffidavitWithWallet = async (wallet: Wallet, affidavit: string): Promise<string> => {
  const toSign = ethers.utils.arrayify(affidavit);
  return wallet.signMessage(toSign);
};

/**
 *
 * @param dataTimestamp
 * @param root
 * @param fcdKeys
 * @param fcdBytes
 */
export const generateAffidavit = (
  dataTimestamp: number,
  root: string,
  fcdKeys: string[],
  fcdBytes: string[],
): string => {
  let testimony = `0x${abiUintEncoder(dataTimestamp, 32)}${remove0x(root)}`;

  fcdKeys.forEach((key, i) => {
    testimony += ethers.utils.defaultAbiCoder
      .encode(['bytes32', 'uint256'], [LeafKeyCoder.encode(key), fcdBytes[i]])
      .slice(2);
  });

  return ethers.utils.keccak256(testimony);
};

export const sortLeaves = (feeds: Leaf[]): Leaf[] => {
  return sort(feeds).asc(({label}) => label);
};

export const chainReadyForNewBlock = (
  chainStatus: ChainStatus,
  newDataTimestamp: number,
): [ready: boolean, error: string | undefined] => {
  if (newDataTimestamp <= chainStatus.lastDataTimestamp) {
    return [
      false,
      `skipping ${newDataTimestamp}, waiting for new consensus (OLD-${
        chainStatus.lastDataTimestamp - newDataTimestamp
      })`,
    ];
  }

  const deltaT = newDataTimestamp - chainStatus.lastDataTimestamp - chainStatus.timePadding;

  if (deltaT < 0) {
    return [
      false,
      `skipping ${newDataTimestamp}: waiting for next round T${deltaT} (${chainStatus.lastDataTimestamp}, ${chainStatus.timePadding})`,
    ];
  }

  return [true, undefined];
};

export const sortSignaturesBySigner = (signatures: string[], affidavit: string): string[] =>
  signatures
    .map((signature) => [recoverSigner(affidavit, signature), signature])
    .sort((a, b) => (a[0].toLowerCase() < b[0].toLowerCase() ? -1 : 1))
    .map(([, signature]) => signature);

import {ethers, Wallet} from 'ethers';
import {LeafKeyCoder, LeafValueCoder} from '@umb-network/toolbox';
import Leaf from '../types/Leaf';
import sort from 'fast-sort';
import {ChainStatus} from '../types/ChainStatus';
import {remove0x} from '@umb-network/toolbox/dist/utils/helpers';

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

  return ethers.utils.computeAddress(pubKey);
};

export const signAffidavitWithWallet = async (wallet: Wallet, affidavit: string): Promise<string> => {
  const toSign = ethers.utils.arrayify(affidavit);
  return wallet.signMessage(toSign);
};

export const generateAffidavit = (
  dataTimestamp: number,
  root: string,
  fcdKeys: string[],
  fcdValues: number[],
): string => {
  let testimony = `0x${abiUintEncoder(dataTimestamp, 32)}${root.replace('0x', '')}`;

  fcdKeys.forEach((key, i) => {
    testimony += ethers.utils.defaultAbiCoder
      .encode(['bytes32', 'uint256'], [LeafKeyCoder.encode(key), LeafValueCoder.encode(fcdValues[i])])
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
  if (chainStatus.lastDataTimestamp + chainStatus.timePadding > timestamp()) {
    return [false, `skipping ${chainStatus.nextBlockId.toString()}: waiting for next round`];
  }

  if (newDataTimestamp <= chainStatus.lastDataTimestamp) {
    return [
      false,
      `skipping ${chainStatus.nextBlockId.toString()}, can NOT submit older data ${
        chainStatus.lastDataTimestamp
      } vs ${newDataTimestamp}`,
    ];
  }

  return [true, undefined];
};

export const sortSignaturesBySigner = (signatures: string[], affidavit: string): string[] =>
  signatures
    .map((signature) => [recoverSigner(affidavit, signature), signature])
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([, signature]) => signature);

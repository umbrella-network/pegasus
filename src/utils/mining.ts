import {ethers, Wallet} from 'ethers';
import {converters} from '@umb-network/toolbox';
import Leaf from '../models/Leaf';
import sort from 'fast-sort';

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
  blockHeight: number,
  numericFCDKeys: string[],
  numericFCDValues: number[],
): string => {
  const encoder = new ethers.utils.AbiCoder();
  let testimony = encoder.encode(['uint256', 'uint256', 'bytes32'], [blockHeight, dataTimestamp, root]);

  numericFCDKeys.forEach((key, i) => {
    testimony += ethers.utils.defaultAbiCoder
      .encode(['bytes32', 'uint256'], [converters.strToBytes32(key), converters.numberToUint256(numericFCDValues[i])])
      .slice(2);
  });

  return ethers.utils.keccak256(testimony);
};

export const sortLeaves = (feeds: Leaf[]): Leaf[] => {
  return sort(feeds).asc(({label}) => label);
};

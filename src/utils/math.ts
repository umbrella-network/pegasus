import {BigNumber} from 'ethers';
import {LeafValueCoder} from '@umb-network/toolbox';
import {FeedValue} from '../types/Feed.js';

const calcFixedDiscrepancy = (val1: string, val2: string): number => {
  const val1bn = BigNumber.from(val1);
  return val1bn.sub(val2).div(val1bn.add(val2)).abs().mul(2).toNumber();
};

const calcNumberDiscrepancy = (val1: number, val2: number): number => {
  return (2 * Math.abs(val1 - val2)) / (val1 + val2);
};

export const calcDiscrepancy = (val1: FeedValue, val2: FeedValue, label: string): number => {
  return LeafValueCoder.isFixedValue(label)
    ? calcFixedDiscrepancy(val1 as string, val2 as string)
    : calcNumberDiscrepancy(val1 as number, val2 as number);
};

export function bigIntToFloatingPoint(integerValue: bigint, decimals: number): number {
  const stringValue = integerValue.toString();

  let intPart = '';
  let decPart = '';
  const lengthDiff = stringValue.length - decimals;
  if (lengthDiff > 0) {
    intPart = stringValue.substring(0, lengthDiff);
    decPart = stringValue.substring(lengthDiff);
  } else {
    intPart = '0';
    decPart = '0'.repeat(-lengthDiff) + stringValue;
  }

  return Number(intPart + '.' + decPart);
}

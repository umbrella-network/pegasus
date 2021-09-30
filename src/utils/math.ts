import {BigNumber} from 'ethers';
import {LeafValueCoder} from '@umb-network/toolbox';
import {FeedValue} from '../types/Feed';

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

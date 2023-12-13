import {HexString} from '@concordium/web-sdk';
import {ethers} from 'ethers';
import {FeedName, HexStringWith0x} from '../types/Feed';

export function hashFeedName(feenName: FeedName): HexString {
  return ethers.utils.id(feenName).replace('0x', '');
}

export function hashFeedName0x(feenName: FeedName): HexStringWith0x {
  return ethers.utils.id(feenName);
}

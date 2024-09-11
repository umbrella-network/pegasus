import {BigNumber} from 'ethers';
import {ChainsIds} from './ChainsIds.js';

export interface Validator {
  id: string;
  location: string;
  power: BigNumber;
}

export interface ChainValidator extends Validator {
  chains: Set<ChainsIds>;
}

import {BigNumber} from 'ethers';

export interface Validator {
  id: string;
  location: string;
  power: BigNumber;
}

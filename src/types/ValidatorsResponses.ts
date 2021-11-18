import {BigNumber} from 'ethers';

export interface ValidatorsResponses {
  signatures: string[];
  discrepantKeys: Set<string>;
  powers: BigNumber;
}

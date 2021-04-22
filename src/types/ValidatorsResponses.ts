import {BigNumber} from 'ethers';

export interface ValidatorsResponses {
  signatures: string[];
  discrepanciesKeys: Set<string>;
  powers: BigNumber;
}

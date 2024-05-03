import {Contract} from 'ethers';

export interface ContractHelperInterface {
  getContract(): Contract;
}

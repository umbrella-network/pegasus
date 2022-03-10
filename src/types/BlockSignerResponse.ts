import {Discrepancy} from './Discrepancy';
import {BigNumber} from 'ethers';

export interface BlockSignerResponse {
  error?: string;
  signature?: string;
  discrepancies: Discrepancy[];
  version: string;
}

export interface BlockSignerResponseWithPower extends BlockSignerResponse {
  power: BigNumber;
  validator?: string;
}

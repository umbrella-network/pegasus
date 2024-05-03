import {Contract} from 'ethers';
import {StaticJsonRpcProvider} from '@ethersproject/providers';
import Settings from 'src/types/Settings.js';

export interface DexProtocolInterface {
  readonly settings: Settings;
  readonly contractAddress?: string;
  readonly provider: StaticJsonRpcProvider;
  readonly contract?: Contract;

  getPoolCreatedEvents(fromBlock: number, toBlock?: number): Promise<any>;
}

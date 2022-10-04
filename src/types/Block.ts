import {HexStringWith0x} from './custom';

export interface IBlock {
  _id: string;
  minted: boolean;
  chainAddress: string;
  timestamp: Date;
  dataTimestamp: Date;
  blockId: number;
  root: string;
  data: Record<string, HexStringWith0x>;
  fcdKeys: Array<string>;
}

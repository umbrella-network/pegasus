import {index, prop} from '@typegoose/typegoose';

import {HexStringWith0x} from '../types/custom';

@index({expireAt: 1}, {expireAfterSeconds: 0})
class ConsensusData {
  @prop({required: true})
  root!: string;

  @prop({required: true, type: () => [String]})
  chainIds!: Array<string>;

  @prop({required: true, type: () => [String]})
  signatures!: Array<string>;

  @prop({required: true, type: () => [String]})
  fcdKeys!: Array<string>;

  @prop({required: true, type: () => [String]})
  fcdValues!: Array<HexStringWith0x>;

  @prop({required: true})
  timestamp!: number;

  @prop({required: true})
  expireAt!: Date;
}

export default ConsensusData;

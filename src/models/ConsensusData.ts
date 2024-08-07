import {index, modelOptions, prop, Severity} from '@typegoose/typegoose';
import mongoose from 'mongoose';

import Leaf from '../types/Leaf.js';
import {HexStringWith0x} from '../types/custom.js';
import {SignatureWithSigner} from '../types/DeviationFeeds.js';

@index({expireAt: 1}, {expireAfterSeconds: 0})
@modelOptions({options: {allowMixed: Severity.ALLOW}})
class ConsensusData {
  @prop({required: true})
  root!: string;

  @prop({required: true, type: () => [String]})
  chainIds!: Array<string>;

  @prop({required: true, type: () => [String]})
  signatures!: Array<SignatureWithSigner>;

  @prop({required: true, type: () => [String]})
  fcdKeys!: Array<string>;

  @prop({required: true, type: () => [String]})
  fcdValues!: Array<HexStringWith0x>;

  @prop({type: mongoose.SchemaTypes.Mixed})
  leaves!: Array<Leaf>;

  @prop({required: true})
  dataTimestamp!: number;

  @prop({required: true})
  expireAt!: Date;
}

export default ConsensusData;

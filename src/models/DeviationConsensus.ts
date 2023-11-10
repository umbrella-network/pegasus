import {index, modelOptions, prop, Severity} from '@typegoose/typegoose';
import mongoose from 'mongoose';

import {PriceData} from '../types/DeviationFeeds.js';

@index({chainId: 1})
@index({createdAt: 1}, {expireAfterSeconds: 300})
@modelOptions({options: {allowMixed: Severity.ALLOW}})
export class DeviationConsensus {
  @prop({required: true})
  chainId!: string;

  @prop({required: true, type: () => [String]})
  keys!: Array<string>;

  @prop({required: true, type: () => [String]})
  signatures!: Array<string>;

  @prop({type: mongoose.SchemaTypes.Mixed})
  priceData!: Array<PriceData>;

  @prop({required: true})
  dataTimestamp!: number;

  @prop({required: true})
  createdAt!: Date;
}

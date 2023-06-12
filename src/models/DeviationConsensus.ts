import {index, modelOptions, prop, Severity} from '@typegoose/typegoose';
import {SchemaTypes} from 'mongoose';

import {PriceData} from '../types/DeviationFeeds';

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

  @prop({type: SchemaTypes.Mixed})
  priceData!: Array<PriceData>;

  @prop({required: true})
  dataTimestamp!: number;

  @prop({required: true})
  createdAt!: Date;
}

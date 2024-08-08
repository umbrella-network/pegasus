import {index, prop} from '@typegoose/typegoose';

// TODO deprecated, remove
@index({timestamp: 1})
@index({source: 1, symbol: 1, timestamp: 1})
@index({expireAt: 1}, {expireAfterSeconds: 0})
export class Price {
  @prop({required: true})
  source!: string;

  @prop({required: true})
  symbol!: string;

  @prop({required: true})
  timestamp!: Date;

  @prop({required: true})
  value!: number;

  @prop({required: true})
  expireAt!: Date;
}

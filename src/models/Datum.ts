import {index, prop} from '@typegoose/typegoose';

@index({timestamp: 1})
@index({source: 1, symbol: 1, timestamp: 1})
@index({expireAt: 1}, {expireAfterSeconds: 0})
export class Datum {
  @prop({required: true})
  source!: string;

  @prop({required: true})
  symbol!: string;

  @prop({required: true})
  timestamp!: Date;

  @prop({required: true})
  value!: string;

  @prop()
  type?: string;

  @prop({required: true})
  expireAt!: Date;
}

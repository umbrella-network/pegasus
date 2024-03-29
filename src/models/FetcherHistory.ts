import {index, prop} from '@typegoose/typegoose';

@index({timestamp: 1})
@index({fetcher: 1})
@index({symbol: 1})
@index({fetcher: 1, symbol: 1, timestamp: 1}, {unique: true})
@index({expireAt: 1}, {expireAfterSeconds: 0})
export class FetcherHistory {
  @prop({required: true})
  fetcher!: string;

  @prop({required: true})
  symbol!: string;

  @prop({required: true})
  timestamp!: number;

  @prop({required: true})
  value!: string;

  @prop({required: true})
  expireAt!: Date;
}

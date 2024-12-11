import {index, prop} from '@typegoose/typegoose';
import {CommonPriceModel} from './common/CommonPriceModel.js';

@index({timestamp: -1, symbol: 1, interval: 1, fetcher: 1}, {unique: true})
export class CandlestickModel extends CommonPriceModel {
  @prop({required: true, lowercase: true})
  symbol!: string;

  @prop({required: true})
  interval!: number;

  @prop({required: true})
  fetcher!: string;
}

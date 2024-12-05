import {index, prop} from '@typegoose/typegoose';
import {CommonPriceModel} from './common/CommonPriceModel.js';

@index({timestamp: -1, symbol: 1, interval: 1}, {unique: true})
export class CandlestickModel_Binance extends CommonPriceModel {
  // timestamp is endTime - because this is when data will be deprecated and ready to purge
  @prop({required: true, lowercase: true})
  symbol!: string;

  @prop({required: true})
  interval!: number;
}

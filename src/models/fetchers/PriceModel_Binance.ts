import {index, prop} from '@typegoose/typegoose';
import {CommonPriceModel} from './common/CommonPriceModel.js';

@index({symbol: 1})
@index({timestamp: -1, symbol: 1}, {unique: true})
export class PriceModel_Binance extends CommonPriceModel {
  @prop({required: true, lowercase: true})
  symbol!: string;
}

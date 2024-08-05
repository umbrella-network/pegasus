import {index, prop} from '@typegoose/typegoose';
import {CommonPriceModel} from './common/CommonPriceModel.js';

@index({symbol: 1})
@index({timestamp: -1, symbol: 1}, {unique: true})
export class BinancePriceModel extends CommonPriceModel {
  @prop({required: true, lowercase: true})
  symbol!: string;
}

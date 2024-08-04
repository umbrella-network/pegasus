import {index, prop} from '@typegoose/typegoose';
import {CommonPriceModel} from './CommonPriceModel.js';

@index({symbol: 1})
@index({timestamp: -1, symbol: 1}, {unique: true})
export class ByBitPriceModel extends CommonPriceModel {
  @prop({required: true})
  symbol!: string;
}

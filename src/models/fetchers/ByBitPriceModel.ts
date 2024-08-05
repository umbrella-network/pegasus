import {index, prop} from '@typegoose/typegoose';
import {CommonPriceModel} from './common/CommonPriceModel.js';

@index({symbol: 1})
@index({timestamp: -1, symbol: 1}, {unique: true})
export class ByBitPriceModel extends CommonPriceModel {
  @prop({required: true, lowercase: true})
  symbol!: string;

  @prop({default: null})
  usdIndexPrice!: number | null;
}

import {index, prop} from '@typegoose/typegoose';
import {CommonPriceModel} from './common/CommonPriceModel.js';

@index({symbol: 1, currency: 1})
@index({timestamp: -1, symbol: 1, currency: 1}, {unique: true})
export class PriceModel_MetalPriceApi extends CommonPriceModel {
  @prop({required: true, lowercase: true})
  symbol!: string;

  @prop({lowercase: true})
  currency!: string;
}

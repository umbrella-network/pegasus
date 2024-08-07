import {index, prop} from '@typegoose/typegoose';
import {CommonPriceModel} from './common/CommonPriceModel.js';

@index({timestamp: -1, symbol: 1}, {unique: true})
export class PolygonIOCryptoPriceModel extends CommonPriceModel {
  @prop({required: true, lowercase: true})
  symbol!: string;
}

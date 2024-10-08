import {index, prop} from '@typegoose/typegoose';
import {CommonPriceModel} from './common/CommonPriceModel.js';

@index({timestamp: -1, symbol: 1}, {unique: true})
export class PriceModel_PolygonIOCryptoSnapshot extends CommonPriceModel {
  @prop({required: true, lowercase: true})
  symbol!: string;
}

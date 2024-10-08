import {index, prop} from '@typegoose/typegoose';
import {CommonPriceModel} from './common/CommonPriceModel.js';

@index({timestamp: -1, ticker: 1}, {unique: true})
export class PriceModel_PolygonIOCurrencySnapshotGrams extends CommonPriceModel {
  @prop({required: true, lowercase: true})
  ticker!: string;
}

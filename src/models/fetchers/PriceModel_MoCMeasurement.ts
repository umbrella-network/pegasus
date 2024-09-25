import {index, prop} from '@typegoose/typegoose';
import {CommonPriceModel} from './common/CommonPriceModel.js';

@index({measurement_id: 1})
@index({timestamp: -1, measurement_id: 1}, {unique: true})
export class PriceModel_MoCMeasurement extends CommonPriceModel {
  @prop({required: true})
  measurement_id!: string;

  @prop({required: true})
  field!: string;
}

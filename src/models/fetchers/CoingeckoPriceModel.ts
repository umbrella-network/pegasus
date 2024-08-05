import {index, prop} from '@typegoose/typegoose';
import {CommonPriceModel} from './common/CommonPriceModel.js';

@index({id: 1})
@index({currency: 1})
@index({timestamp: -1, id: 1, currency: 1}, {unique: true})
export class CoingeckoPriceModel extends CommonPriceModel {
  @prop({required: true, lowercase: true})
  id!: string;

  @prop({required: true, lowercase: true})
  currency!: string;
}

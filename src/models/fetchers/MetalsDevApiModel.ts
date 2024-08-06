import {index, prop} from '@typegoose/typegoose';
import {CommonPriceModel} from './common/CommonPriceModel.js';

@index({metal: 1, currency: 1})
@index({timestamp: -1, metal: 1, currency: 1}, {unique: true})
export class MetalsDevApiModel extends CommonPriceModel {
  @prop({required: true, lowercase: true})
  metal!: string;

  @prop({lowercase: true})
  currency!: string;
}

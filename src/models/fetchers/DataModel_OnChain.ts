import {index, prop} from '@typegoose/typegoose';
import {CommonPriceModel} from './common/CommonPriceModel.js';

@index({methodDataHash: 1, chainId: 1, targetAddress: 1, inputArgs: 1})
@index({timestamp: -1, methodDataHash: 1, chainId: 1, targetAddress: 1, inputArgs: 1}, {unique: true})
export class DataModel_OnChain extends CommonPriceModel {
  @prop({required: true, lowercase: true})
  chainId!: string;

  @prop({lowercase: true})
  targetAddress!: string;

  @prop()
  method!: string;

  @prop()
  inputArgs!: string[];
}

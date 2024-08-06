import {index, prop} from '@typegoose/typegoose';
import {CommonPriceModel} from './common/CommonPriceModel.js';

@index({timestamp: -1, methodDataHash: 1, chainId: 1, targetAddress: 1}, {unique: true})
export class OnChainDataModel extends CommonPriceModel {
  @prop({required: true, lowercase: true})
  chainId!: string;

  @prop({lowercase: true})
  targetAddress!: string;

  @prop({lowercase: true})
  inputDataHash!: string; // hash(method,inputsTypes,args)
}

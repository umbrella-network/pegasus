import {index, prop} from '@typegoose/typegoose';
import {CommonPriceModel} from './common/CommonPriceModel.js';

@index({chainId: 1, base: 1, quote: 1})
@index({timestamp: -1, chainId: 1, base: 1, quote: 1}, {unique: true})
export class UniswapV3DataModel extends CommonPriceModel {
  @prop({required: true, lowercase: true})
  chainId!: string;

  @prop({lowercase: true})
  base!: string;

  @prop({lowercase: true})
  quote!: string;

  @prop()
  amountInDecimals!: number;
}

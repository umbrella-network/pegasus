import {index, prop} from '@typegoose/typegoose';
import {CommonPriceModel} from './common/CommonPriceModel.js';

@index({chainId: -1, blockNumber: -1}, {unique: true, name: 'BlockchainGasPerBlock'})
@index({chainId: 1, timestamp: 1})
export class PriceModel_Gas extends CommonPriceModel {
  @prop()
  chainId!: string;

  @prop()
  blockNumber!: number;
}

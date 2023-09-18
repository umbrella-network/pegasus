import {index, prop} from '@typegoose/typegoose';

@index({chainId: -1, blockNumber: -1}, {unique: true, name: 'BlockchainGasPerBlock'})
class GasPrice {
  @prop()
  _id!: string;

  @prop()
  chainId!: string;

  @prop()
  blockNumber!: number;

  @prop()
  blockTimestamp!: number;

  @prop()
  gas!: string;
}

export default GasPrice;

import {index, modelOptions, prop, Severity} from '@typegoose/typegoose';

@index({chainId: 1, protocol: 1, token0: 1, token1: 1})
@index({chainId: 1, fee: 1, token0: 1, token1: 1, address: 1}, {unique: true})
@index({chainId: 1, address: 1})
@modelOptions({options: {allowMixed: Severity.ALLOW}})
export class UniswapV3Pool {
  @prop({required: true})
  chainId!: string;

  @prop({required: true})
  protocol!: string;

  @prop({required: true, lowercase: true})
  token0!: string;

  @prop({required: true, lowercase: true})
  token1!: string;

  @prop({required: true})
  fee!: number;

  @prop({required: true, lowercase: true})
  address!: string;

  @prop()
  liquidityActive!: string;

  @prop()
  liquidityLockedToken0!: number;

  @prop()
  liquidityLockedToken1!: number;

  @prop()
  createdDate?: Date;

  @prop()
  liquidityUpdatedAt?: Date;
}

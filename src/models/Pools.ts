import {index, modelOptions, prop, Severity} from '@typegoose/typegoose';

@index({chainId: 1, protocol: 1, token0: 1, token1: 1})
@index({chainId: 1, fee: 1, token0: 1, token1: 1})
@index({chainId: 1, pool: 1})
@modelOptions({options: {allowMixed: Severity.ALLOW}})
export class Pools {
  @prop({required: true})
  chainId!: string;

  @prop({required: true})
  protocol!: string;

  @prop({required: true})
  token0!: string;

  @prop({required: true})
  token1!: string;

  @prop({required: true})
  fee!: number;

  @prop({required: true})
  pool!: string;

  @prop()
  lastUpdatedAt?: Date;
}

import {index, modelOptions, prop, Severity} from '@typegoose/typegoose';

@index({chainId: 1})
@index({dexProtocol: 1})
@index({token0: 1})
@index({token1: 1})
@index({pool: 1})
@index({chainId: 1, dexProtocol: 1, token0: 1, token1: 1})
@modelOptions({options: {allowMixed: Severity.ALLOW}})
export class Dexes {
  @prop({required: true})
  chainId!: string;

  @prop({required: true})
  dexProtocol!: string;

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

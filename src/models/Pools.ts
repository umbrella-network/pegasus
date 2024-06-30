import {index, modelOptions, prop, Severity} from '@typegoose/typegoose';

@index({address: 1})
@index({token0: 1})
@index({token1: 1})
@modelOptions({options: {allowMixed: Severity.ALLOW}})
export class SovrynPoolSchema {
  @prop({required: true})
  address!: string;

  @prop({required: true})
  token0!: string;

  @prop({required: true})
  token1!: string;

  @prop({required: true})
  chainId!: string;

  @prop()
  lastUpdatedAt?: Date;
}

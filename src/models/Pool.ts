import {index, modelOptions, prop, Severity} from '@typegoose/typegoose';

@index({address: 1})
@index({token0: 1})
@index({token1: 1})
@modelOptions({options: {allowMixed: Severity.ALLOW}})
export class Pool {
  @prop({required: true})
  address!: string;

  @prop({required: false})
  token0!: string;

  @prop({required: false})
  token1!: string;

  @prop()
  lastUpdatedAt?: Date;
}

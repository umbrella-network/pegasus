import {index, modelOptions, prop, Severity} from '@typegoose/typegoose';

@index({chainId: 1, address: 1}, {unique: true})
@modelOptions({options: {allowMixed: Severity.ALLOW}})
export class Token {
  @prop({required: true})
  chainId!: string;

  @prop({required: true, lowercase: true})
  address!: string;

  @prop({required: true})
  decimals!: number;

  @prop({required: true})
  symbol!: string;

  @prop({required: true})
  name!: string;
}

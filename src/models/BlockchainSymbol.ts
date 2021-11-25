import {index, modelOptions, prop, Severity} from '@typegoose/typegoose';

type UniswapMeta = {
  fee: number;
};

export type Meta = UniswapMeta;

export type Token = {
  symbol: string;
  address: string;
};

@index({symbol: 1})
@index({type: 1})
@index({blockchainId: 1})
@index({verified: 1})
@modelOptions({options: {allowMixed: Severity.ALLOW}})
export class BlockchainSymbol {
  @prop({required: true})
  symbol!: string;

  @prop({required: true})
  type!: string;

  @prop({required: true})
  blockchainId!: string;

  @prop({required: true})
  verified!: boolean;

  @prop({required: true})
  tokens!: Token[];

  @prop()
  meta?: Meta;
}

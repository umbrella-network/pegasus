import {index, prop} from '@typegoose/typegoose';

@index({timestamp: -1})
@index({signer: 1})
@index({id: 1, currency: 1})
export class CommonPriceModel {
  @prop({required: true})
  value!: string;

  @prop({required: true})
  valueType!: string; // e.g. number, hex, string

  @prop({required: true})
  timestamp!: number;

  @prop({required: true, lowercase: true})
  signer!: string;

  @prop({required: true})
  hashVersion!: number;

  @prop({required: true})
  priceHash!: string;

  @prop({required: true})
  signature!: string;
}

import {index, prop} from '@typegoose/typegoose';

@index({timestamp: 1})
@index({fetcher: 1})
@index({feedBase: 1})
@index({feedQuote: 1})
@index({fetcherSource: 1})
@index({signer: 1})
@index({fetcher: 1, feedBase: 1, feedQuote: 1, timestamp: 1, fetcherSource: 1}, {unique: true})
export class PriceDataModel {
  @prop({required: true})
  fetcher!: string;

  @prop({required: true})
  value!: string;

  @prop({required: true})
  valueType!: string; // e.g. number, hex, string

  @prop({required: true})
  timestamp!: number;

  @prop({required: true})
  feedBase!: string; // e.g. UMB

  @prop({required: true})
  feedQuote!: string; // e.g: USDC

  @prop({required: false})
  fetcherSource!: string;

  @prop({required: false})
  quoteLiquidity!: string;

  @prop({required: true})
  signer!: string;

  @prop({required: true})
  hashVersion!: number;

  @prop({required: true})
  priceHash!: string;

  @prop({required: true})
  signature!: string;
}

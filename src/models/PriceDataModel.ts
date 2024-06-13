import {index, prop} from '@typegoose/typegoose';

@index({timestamp: 1})
@index({fetcher: 1})
@index({symbol: 1})
@index({fetcherSource: 1})
@index({fetcher: 1, symbol: 1, timestamp: 1, fetcherSource: 1}, {unique: true})
export class PriceDataModel {
  @prop({required: true})
  fetcher!: string;

  @prop({required: true})
  value!: string;

  @prop({required: true})
  timestamp!: number;

  @prop({required: true})
  symbol!: string;

  @prop({required: true})
  fetcherSource!: string;
}

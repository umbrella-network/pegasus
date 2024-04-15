import {index, prop} from '@typegoose/typegoose';

@index({address: 1}, {unique: true})
@index({symbol: 1})
export class Price {
  @prop({required: true})
  address!: string;

  @prop({required: true})
  symbol!: string;
}

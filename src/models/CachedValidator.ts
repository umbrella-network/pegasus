import {index, prop} from '@typegoose/typegoose';

@index({address: 1, chainId: 1}, {unique: true, name: 'CachedValidator_chain_address'})
@index({location: 1, chainId: 1}, {unique: true, name: 'CachedValidator_location'})
@index({contractIndex: 1, chainId: 1}, {unique: true, name: 'CachedValidator_contractIndex'})
class CachedValidator {
  @prop()
  _id!: string;

  @prop()
  chainId!: string;

  @prop({lowercase: true})
  address!: string;

  @prop()
  contractIndex!: number;

  @prop({lowercase: true})
  location!: string;

  @prop()
  power!: string;

  @prop()
  updatedAt!: Date;
}

export default CachedValidator;

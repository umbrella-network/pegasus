import {index, prop} from '@typegoose/typegoose';

@index({address: 1}, {unique: true, name: 'CachedValidator_address'})
@index({location: 1}, {unique: true, name: 'CachedValidator_location'})
@index({contractIndex: 1}, {unique: true, name: 'CachedValidator_contractIndex'})
class CachedValidator {
  @prop()
  _id!: string;

  @prop()
  address!: string;

  @prop()
  contractIndex!: number;

  @prop()
  location!: string;

  @prop()
  power!: string;

  @prop()
  updatedAt!: Date;
}

export default CachedValidator;

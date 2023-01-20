import {prop} from '@typegoose/typegoose';

export class Mapping {
  @prop()
  _id!: string;

  @prop()
  value!: string;
}

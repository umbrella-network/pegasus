import { index, prop } from '@typegoose/typegoose';

@index({ feedId: 1, timestamp: 1})
class Leaf {
  @prop()
  _id!: string;

  @prop()
  feedId!: string;

  @prop()
  timestamp!: Date;

  @prop()
  label!: string;

  @prop()
  value!: number;
}

export default Leaf;

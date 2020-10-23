import { index, prop } from '@typegoose/typegoose';

@index({ feedId: 1, timestamp: 1})
class Datum {
  @prop()
  timestamp!: Date;

  @prop()
  type!: string;

  @prop()
  label!: string;

  @prop()
  value!: number;

  @prop()
  feedId!: string;
}

export default Datum;

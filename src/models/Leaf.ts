import { index, prop } from '@typegoose/typegoose';
import { SchemaTypes } from 'mongoose';

@index({ feedId: 1, timestamp: 1})
@index({ blockHeight: 1 })
class Leaf {
  @prop()
  _id!: string;

  @prop()
  blockHeight?: number;

  @prop()
  timestamp!: Date;

  @prop()
  label!: string;

  @prop({ type: SchemaTypes.Buffer })
  valueBuffer!: Buffer;
}

export default Leaf;

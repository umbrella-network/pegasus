import { getModelForClass, index, prop } from '@typegoose/typegoose';
import Leaf from './Leaf';

@index({ timestamp: 1 })
@index({ blockHeight: 1 }, { unique: true })
class Block {
  @prop()
  _id!: string;

  @prop()
  timestamp!: Date;

  @prop()
  blockHeight!: string;

  @prop()
  root!: string;

  @prop()
  data!: Record<string, unknown>;
}

export default Block;

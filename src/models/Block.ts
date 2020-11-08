import { index, prop } from '@typegoose/typegoose';

@index({ timestamp: 1 })
@index({ height: 1 }, { unique: true })
class Block {
  @prop()
  _id!: string;

  @prop()
  timestamp!: Date;

  @prop()
  height!: string;

  @prop()
  root!: string;

  @prop()
  data!: Record<string, unknown>;
}

export default Block;

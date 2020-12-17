import { index, prop } from '@typegoose/typegoose';

@index({ timestamp: -1 })
@index({ mintedAt: -1 })
@index({ height: -1 }, { unique: true })
class Block {
  @prop()
  _id!: string;

  @prop()
  timestamp!: Date;

  @prop()
  mintedAt!: Date;

  @prop()
  height!: number;

  @prop()
  root!: string;

  @prop()
  data!: Record<string, unknown>;

  @prop({ type: () => [String] })
  numericFcdKeys!: Array<string>;
}

export default Block;

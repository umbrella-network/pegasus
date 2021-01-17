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

  /**
   * An object, where values should be in HEX format with leading `0x`.
   * @see Leaf#valueBuffer for more info 
   */
  @prop()
  data!: Record<string, string>;

  @prop({ type: () => [String] })
  numericFcdKeys!: Array<string>;
}

export default Block;

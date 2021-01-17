import { index, prop } from '@typegoose/typegoose';

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

  /**
   * HEX representation of the value encoded with LeafValueCoder.
   * The leading `0x` is required for `ethers.utils.solidityKeccak256` to work, as
   * it looks for it.
   */
  @prop()
  valueBuffer!: string;
}

export default Leaf;

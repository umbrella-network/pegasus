import {prop} from '@typegoose/typegoose';
import {HexStringWith0x} from '../types/custom';

class Leaf {
  @prop()
  _id!: string;

  @prop()
  blockId?: number;

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
  valueBytes!: HexStringWith0x;
}

export default Leaf;

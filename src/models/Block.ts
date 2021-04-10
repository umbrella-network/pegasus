import {index, prop} from '@typegoose/typegoose';
import {SchemaTypes} from 'mongoose';
import {HexStringWith0x} from '../types/HexStringWith0x';

@index({timestamp: -1})
@index({mintedAt: -1})
@index({height: -1}, {unique: true})
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
  @prop({type: SchemaTypes.Mixed})
  data!: Record<string, HexStringWith0x>;

  @prop({type: () => [String]})
  numericFcdKeys!: Array<string>;

  @prop({type: () => [Number]})
  numericFcdValues!: Array<number>;
}

export default Block;

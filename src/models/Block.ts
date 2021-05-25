import {index, prop} from '@typegoose/typegoose';
import {SchemaTypes} from 'mongoose';
import {HexStringWith0x} from '../types/custom';

@index({timestamp: -1})
@index({dataTimestamp: -1})
@index({blockId: -1}, {unique: true})
class Block {
  @prop()
  _id!: string;

  @prop()
  chainAddress!: string;

  @prop()
  timestamp!: Date;

  @prop()
  dataTimestamp!: Date;

  @prop()
  blockId!: number;

  @prop()
  anchor!: number;

  @prop()
  minter!: string;

  @prop()
  staked!: string;

  @prop()
  power!: string;

  @prop({type: SchemaTypes.Mixed})
  votes!: Record<string, string>;

  @prop()
  root!: string;

  /**
   * An object, where values should be in HEX format with leading `0x`.
   * @see Leaf#valueBuffer for more info
   */
  @prop({type: SchemaTypes.Mixed})
  data!: Record<string, HexStringWith0x>;

  @prop({type: () => [String]})
  fcdKeys!: Array<string>;

  @prop({type: () => [Number]})
  fcdValues!: Array<number>;
}

export default Block;

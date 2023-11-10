import {index, modelOptions, prop, Severity} from '@typegoose/typegoose';
import mongoose from 'mongoose';
import {HexStringWith0x} from '../types/custom.js';

@index({timestamp: -1})
@index({dataTimestamp: -1})
@index({blockId: -1}, {unique: false})
@modelOptions({options: {allowMixed: Severity.ALLOW}})
class Block {
  @prop()
  _id!: string;

  @prop()
  minted?: boolean;

  @prop()
  chainAddress!: string;

  @prop()
  timestamp!: Date;

  @prop()
  dataTimestamp!: Date;

  @prop()
  blockId!: number;

  @prop()
  root!: string;

  /**
   * An object, where values should be in HEX format with leading `0x`.
   * @see Leaf#valueBuffer for more info
   */
  @prop({type: mongoose.SchemaTypes.Mixed})
  data!: Record<string, HexStringWith0x>;

  @prop({type: () => [String]})
  fcdKeys!: Array<string>;
}

export default Block;

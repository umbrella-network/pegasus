import {index, prop} from '@typegoose/typegoose';

@index({blockchainId: 1, referenceId: 1}, {unique: true})
@index({blockHeight: 1})
export class BlockchainMarker {
  @prop()
  blockchainId!: string;

  @prop()
  referenceId!: string;

  @prop()
  blockHeight!: number;
}

import '../boot';
import { DocumentType, getModelForClass } from '@typegoose/typegoose';
import Leaf from '../models/Leaf';
import { LeafValueCoder } from '@umb-network/toolbox';
import { getLeafType } from '../utils/to-leaf-value-type';
import { connection } from 'mongoose';
import Block from '../models/Block';

(async (): Promise<void> => {
  const leafsWithNoValueAsBufferCursor = getModelForClass(Leaf)
    .find({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      valueBuffer: null,
    })
    .cursor();

  let leaf: DocumentType<Leaf> = await leafsWithNoValueAsBufferCursor.next();

  while (leaf) {
    const value = (leaf as any)['value'];
    const type = getLeafType(value);

    leaf.valueBuffer = '0x' + LeafValueCoder.encode(value, type).toString('hex');

    await leaf.save();

    leaf = await leafsWithNoValueAsBufferCursor.next();
  }

  const blocksCursor = getModelForClass(Block)
    .aggregate([
      {
        $addFields: {
          dataEntries: { $objectToArray: '$data' },
        },
      },
      {
        $match: {
          dataEntries: {
            $elemMatch: {
              v: { $not: { $type: 'string' } },
            },
          },
        },
      },
    ])
    .cursor({ batchSize: 100 })
    .exec();

  let block: Block & { dataEntries: { k: string; v: unknown}} = await blocksCursor.next();

  while (block) {
    Object.keys(block.data).forEach((key) => {
      if (typeof block.data[key] !== 'string') {
        const leafType = getLeafType(block.data[key]);
        block.data[key] = '0x' + LeafValueCoder.encode(block.data[key], leafType).toString('hex');
      }
    });

    await getModelForClass(Block)
      .updateOne(
        {
          _id: block._id,
        },
        {
          $set: {
            data: block.data
          }
        }
      )

    block = await blocksCursor.next();
  }

  await connection.close();
})();

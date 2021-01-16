import '../boot';
import { getModelForClass } from '@typegoose/typegoose';
import Leaf from '../models/Leaf';
import { LeafValueCoder } from '@umb-network/toolbox';
import { getLeafType } from '../utils/to-leaf-value-type';
import { Types, connection } from 'mongoose';

(async (): Promise<void> => {
  const leafsWithNoValueAsBuffer = await getModelForClass(Leaf)
    .find()
    .exec()

    leafsWithNoValueAsBuffer.forEach(leaf => {
      const type = getLeafType((leaf as any)['value'])

      leaf.valueBuffer = new Types.Buffer(LeafValueCoder.encode(leaf.valueBuffer, type))
    })

    await Promise.all(leafsWithNoValueAsBuffer.map(leaf => leaf.save()))

    await connection.close()
})();

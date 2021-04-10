import {getModelForClass} from '@typegoose/typegoose';
import {injectable} from 'inversify';

import Leaf from '../models/Leaf';

@injectable()
class LeafPersistor {
  async apply(leaf: Leaf): Promise<void> {
    if (!leaf.valueBytes) {
      throw new Error('Cannot persist feeds without a value');
    }

    await this.save(leaf);
  }

  private save = async (leaf: Leaf): Promise<void> => {
    getModelForClass(Leaf).create(leaf);
  };
}

export default LeafPersistor;

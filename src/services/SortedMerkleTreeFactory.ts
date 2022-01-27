import {injectable} from 'inversify';

import Leaf from '../types/Leaf';
import {KeyValuePairs} from '../types/custom';
import {SortedMerkleTree} from '@umb-network/toolbox';
import {remove0x} from '@umb-network/toolbox/dist/utils/helpers';

@injectable()
class SortedMerkleTreeFactory {
  static apply(sortedLeaves: Leaf[]): SortedMerkleTree {
    const treeData: KeyValuePairs = {};

    sortedLeaves.forEach((leaf) => {
      try {
        treeData[leaf.label] = Buffer.from(remove0x(leaf.valueBytes), 'hex');
      } catch (e) {
        // TODO: This class is injectable but is being used as a static - refactor into a service object.
        // otherwise we cannot inject loggers, etc.
      }
    });

    return new SortedMerkleTree(treeData);
  }
}

export default SortedMerkleTreeFactory;

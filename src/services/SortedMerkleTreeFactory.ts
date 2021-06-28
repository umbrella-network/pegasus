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
      treeData[leaf.label] = Buffer.from(remove0x(leaf.valueBytes), 'hex');
    });

    return new SortedMerkleTree(treeData);
  }
}

export default SortedMerkleTreeFactory;

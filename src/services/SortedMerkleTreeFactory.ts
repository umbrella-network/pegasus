import {injectable} from 'inversify';
import {LeafType, LeafValueCoder} from '@umb-network/toolbox';

import Leaf from '../models/Leaf';
import SortedMerkleTree from '../lib/SortedMerkleTree';

@injectable()
class SortedMerkleTreeFactory {
  apply(sortedLeaves: Leaf[]): SortedMerkleTree {
    const treeData = sortedLeaves
      .map((leaf) => {
        const key = leaf.label;
        const value = leaf.valueBuffer;
        return {[key]: value};
      })
      .reduce((acc, v) => ({...acc, ...v}), {});

    return new SortedMerkleTree(treeData);
  }
}

export default SortedMerkleTreeFactory;

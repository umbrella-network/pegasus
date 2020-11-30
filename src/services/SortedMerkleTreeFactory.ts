import {injectable} from 'inversify';
import {LeafType, LeafValueCoder} from '@umb-network/toolbox';

import Leaf from '../models/Leaf';
import SortedMerkleTree from '../lib/SortedMerkleTree';

@injectable()
class SortedMerkleTreeFactory {
  apply(leaves: Leaf[]): SortedMerkleTree {
    const treeData = leaves
      .map((leaf) => {
        const key = leaf.label;
        const value = LeafValueCoder.encode(leaf.value, LeafType.TYPE_FLOAT);
        return {[key]: value};
      })
      .reduce((acc, v) => ({...acc, ...v}), {});

    return new SortedMerkleTree(treeData);
  }
}

export default SortedMerkleTreeFactory;

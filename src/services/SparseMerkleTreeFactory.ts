import { injectable } from 'inversify';
import Leaf from '../models/Leaf';
import SparseMerkleTree from '../models/SparseMerkleTree';

@injectable()
class SparseMerkleTreeFactory {
  apply (leaves: Leaf[]): SparseMerkleTree {
    const treeData = leaves.map((leaf) => ({ [leaf.label]: leaf.value })).reduce((acc, v) => ({ ...acc, ...v }), {});
    return new SparseMerkleTree(treeData, 4);
  }
}

export default SparseMerkleTreeFactory;

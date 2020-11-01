import { injectable } from 'inversify';
import * as utils from 'ethereumjs-util';
import Leaf from '../models/Leaf';
import SparseMerkleTree from '../models/SparseMerkleTree';

@injectable()
class SparseMerkleTreeFactory {
  apply (leaves: Leaf[]): SparseMerkleTree {
    const treeData = leaves
      .map((leaf) => {
        const key = '0x' + utils.sha256(Buffer.from(leaf.label)).toString('hex');
        const value = Buffer.from('0x' + utils.sha256(Buffer.from([leaf.value])).toString('hex'));
        return { [key]: value };
      })
      .reduce((acc, v) => ({ ...acc, ...v }), {});

    const depth = Math.max(2, Math.ceil(Math.log2(leaves.length)) + 1);
    return new SparseMerkleTree(treeData, depth);
  }
}

export default SparseMerkleTreeFactory;

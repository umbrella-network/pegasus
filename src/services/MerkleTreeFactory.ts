import { injectable } from 'inversify';
import SparseMerkleTree from '../models/SparseMerkleTree';

@injectable()
class MerkleTreeFactory {
  apply (leaves: Leaf[]): SparseMerkleTree {
    return new SparseMerkleTree();
  }
}

export default MerkleTreeFactory;

import {generateAffidavit, sortLeaves} from '../utils/mining';
import {LeafValueCoder} from '@umb-network/toolbox';
import {ethers} from 'ethers';
import SortedMerkleTreeFactory from '../services/SortedMerkleTreeFactory';
import {ProposedConsensus} from '../types/Consensus';
import Leaf from '../types/Leaf';
import {KeyValues, SignedBlock} from '../types/SignedBlock';

export class ProposedConsensusService {
  static apply(block: SignedBlock): ProposedConsensus {
    const leaves = this.keyValuesToLeaves(block.leaves);
    const proposedTree = SortedMerkleTreeFactory.apply(sortLeaves(leaves));
    const fcds = sortLeaves(this.keyValuesToLeaves(block.fcd));
    const fcdKeys: string[] = fcds.map(({label}) => label);
    const fcdValues: number[] = fcds.map(({valueBytes}) => LeafValueCoder.decode(valueBytes));
    const root = proposedTree.getRoot();
    const affidavit = generateAffidavit(block.dataTimestamp, root, fcdKeys, fcdValues);
    const signer = this.recoverSigner(affidavit, block.signature);

    return {signer, fcds, leaves, affidavit, fcdKeys, root, dataTimestamp: block.dataTimestamp};
  }

  private static keyValuesToLeaves(keyValues: KeyValues): Leaf[] {
    return Object.entries(keyValues).map(([label, value]): Leaf => this.newLeaf(label, value));
  }

  private static newLeaf(label: string, value: number): Leaf {
    return {
      label: label,
      valueBytes: '0x' + LeafValueCoder.encode(value).toString('hex'),
    };
  }

  private static recoverSigner(affidavit: string, signature: string): string {
    const pubKey = ethers.utils.recoverPublicKey(
      ethers.utils.solidityKeccak256(
        ['string', 'bytes32'],
        ['\x19Ethereum Signed Message:\n32', ethers.utils.arrayify(affidavit)],
      ),
      signature,
    );

    return ethers.utils.computeAddress(pubKey);
  }
}

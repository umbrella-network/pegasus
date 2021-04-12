import {LeafType, LeafValueCoder} from '@umb-network/toolbox';
import {BigNumber} from 'ethers';
import Leaf from '../../src/models/Leaf';
import BlockMinter from '../../src/services/BlockMinter';
import SortedMerkleTreeFactory from '../../src/services/SortedMerkleTreeFactory';
import {KeyValues} from '../../src/types/SignedBlock';
import {v4 as uuid} from 'uuid';

const leaf: Leaf = {
  _id: uuid(),
  timestamp: new Date(),
  blockHeight: 1,
  label: 'ETH-USD',
  valueBytes: '0x' + LeafValueCoder.encode(100, LeafType.TYPE_FLOAT).toString('hex'),
};

const affidavit = BlockMinter.generateAffidavit(
  new SortedMerkleTreeFactory().apply([leaf]).getRoot(),
  BigNumber.from(1),
  [leaf.label],
  [100],
);

const fcd: KeyValues = {
  [leaf.label]: 100,
};

export const leafWithAffidavit = {
  leaf,
  affidavit,
  fcd,
};

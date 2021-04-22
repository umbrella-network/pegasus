import {LeafType, LeafValueCoder} from '@umb-network/toolbox';
import Leaf from '../../src/models/Leaf';
import SortedMerkleTreeFactory from '../../src/services/SortedMerkleTreeFactory';
import {KeyValues} from '../../src/types/SignedBlock';
import {v4 as uuid} from 'uuid';
import {generateAffidavit} from '../../src/utils/mining';

const leaf: Leaf = {
  _id: uuid(),
  timestamp: new Date(),
  blockHeight: 1,
  label: 'ETH-USD',
  valueBytes: '0x' + LeafValueCoder.encode(100, LeafType.TYPE_FLOAT).toString('hex'),
};

const affidavit = generateAffidavit(10, new SortedMerkleTreeFactory().apply([leaf]).getRoot(), 1, [leaf.label], [100]);

const fcd: KeyValues = {
  [leaf.label]: 100,
};

export const leafWithAffidavit = {
  leaf,
  affidavit,
  fcd,
};

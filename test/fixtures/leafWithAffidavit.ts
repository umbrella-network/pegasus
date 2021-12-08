import {LeafValueCoder} from '@umb-network/toolbox';
import Leaf from '../../src/types/Leaf';
import SortedMerkleTreeFactory from '../../src/services/SortedMerkleTreeFactory';
import {KeyValues} from '../../src/types/SignedBlock';
import {generateAffidavit} from '../../src/utils/mining';

const timestamp = 1621508941;

const leaf: Leaf = {
  label: 'ETH-USD',
  valueBytes: '0x' + LeafValueCoder.encode(100, '').toString('hex'),
};

const affidavit = generateAffidavit(timestamp, SortedMerkleTreeFactory.apply([leaf]).getRoot(), [leaf.label], [100]);

const fcd: KeyValues = {
  [leaf.label]: 100,
};

export const leafWithAffidavit = {
  leaf,
  affidavit,
  fcd,
  timestamp,
};

import Leaf from '../../src/types/Leaf.js';
import SortedMerkleTreeFactory from '../../src/services/SortedMerkleTreeFactory.js';
import {KeyValues} from '../../src/types/SignedBlock.js';
import {generateAffidavit} from '../../src/utils/mining.js';

const timestamp = 1621508941;

const leaf: Leaf = {
  label: 'ETH-USD',
  valueBytes: '0x6b62c4fdd53aa75cfc25b5b0e582b00e1c6c32769ee6b4ce38656687919c0145',
};

const affidavit = generateAffidavit(
  timestamp,
  SortedMerkleTreeFactory.apply([leaf]).getRoot(),
  [leaf.label],
  [leaf.valueBytes],
);

const fcd: KeyValues = {
  [leaf.label]: leaf.valueBytes,
};

export const leafWithAffidavit = {
  leaf,
  affidavit,
  fcd,
  timestamp,
};

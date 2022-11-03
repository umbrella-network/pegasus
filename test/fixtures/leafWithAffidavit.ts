import Leaf from '../../src/types/Leaf';
import SortedMerkleTreeFactory from '../../src/services/SortedMerkleTreeFactory';
import {KeyValues} from '../../src/types/SignedBlock';
import {generateAffidavit} from '../../src/utils/mining';
import Feeds from '../../src/types/Feed';

const timestamp = 1621508941;

const feed: Feeds = {
  'ETH-USD': {
    symbol: 'ETH-USD',
    discrepancy: 1,
    precision: 2,
    inputs: [
      {
        fetcher: {
          name: 'CryptoComparePriceWS',
          params: {
            fsym: 'ETH',
            tsym: 'USD',
          },
        },
      },
    ],
  },
};

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
  feed,
};

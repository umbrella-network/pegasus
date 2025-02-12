import chai from 'chai';
import {MassaAddress} from '../../../src/blockchains/massa/utils/MassaAddress.js';

const {expect} = chai;

describe('MassaAddress', () => {
  it('[new] sort 6 addresses using Uint256', async () => {
    const ordered = [
      'P1241HUkWn3JiFR1DaFAeHs45W28cGyuXo7UuZW7YD8HTqJBYjuL',
      'P129pqQxdWEzyVhvp8jtxkdx62jV2RASdNDAHepMZuUnFHekMnBv',
      'P12DjfaK36WN5dVQXKmrjT1MszosKVNViXMvqAnm6wbrV3YLtzqk',
      'P12S51EKn4h7NYVLKk2AXycPzPECGCupuFS6DTeMe1yWmGqrnQ2n',
      'P12TJwFzkrgT5fQ3gJiUTpeQei6D2kQV2SRCoHhNbcXj4CqDoQkC',
      'P12W6zgQb5aykbYSz4CfQLuk3axRcp5jYX1fmBT7VRdgVnzv6oHH',
    ];

    const notOrdered = [ordered[3], ordered[2], ordered[0], ordered[1], ordered[5], ordered[4]];

    expect(notOrdered.sort(MassaAddress.sortSmartContractWay)).eql(ordered);
  });

  it('[old] sort 6 addresses', async () => {
    const ordered = [
      'P1241HUkWn3JiFR1DaFAeHs45W28cGyuXo7UuZW7YD8HTqJBYjuL',
      'P129pqQxdWEzyVhvp8jtxkdx62jV2RASdNDAHepMZuUnFHekMnBv',
      'P12DjfaK36WN5dVQXKmrjT1MszosKVNViXMvqAnm6wbrV3YLtzqk',
      'P12S51EKn4h7NYVLKk2AXycPzPECGCupuFS6DTeMe1yWmGqrnQ2n',
      'P12TJwFzkrgT5fQ3gJiUTpeQei6D2kQV2SRCoHhNbcXj4CqDoQkC',
      'P12W6zgQb5aykbYSz4CfQLuk3axRcp5jYX1fmBT7VRdgVnzv6oHH',
    ];

    const notOrdered = [ordered[3], ordered[2], ordered[0], ordered[1], ordered[5], ordered[4]];

    expect(notOrdered.sort(MassaAddress.sort)).eql(ordered);
  });
});

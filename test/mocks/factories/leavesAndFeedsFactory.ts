import {Factory} from 'rosie';
import {LeavesAndFeeds} from '../../../src/types/Consensus';

export const leavesAndFeedsFactory = Factory.define<LeavesAndFeeds>('LeavesAndFeeds')
  .attr('firstClassLeaves', [
    {
      label: 'ETH-USD',
      valueBytes: '0x6b62c4fdd53aa75cfc25b5b0e582b00e1c6c32769ee6b4ce38656687919c0145',
    },
  ])
  .attr('leaves', [
    {
      label: 'ETH-USD',
      valueBytes: '0x6b62c4fdd53aa75cfc25b5b0e582b00e1c6c32769ee6b4ce38656687919c0145',
    },
  ])
  .attr('fcdsFeeds', {
    'ETH-USD': {discrepancy: 1, precision: 2, inputs: []},
    'BTC-USD': {discrepancy: 1, precision: 2, inputs: []},
  })
  .attr('leavesFeeds', {
    'UMB-USD': {
      discrepancy: 1,
      precision: 2,
      inputs: [],
    },
  });

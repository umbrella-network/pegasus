import {Factory} from 'rosie';
import ConsensusData from '../../../src/models/ConsensusData';

export const consensusDataFactory = Factory.define<ConsensusData>('ConsensusData')
  .attr('root', '0xabctest')
  .attr('chainIds', ['bsc'])
  .attr('signatures', [
    '0x19e072d918b90c1986625b2968fe3b740f3b5eacedfc79e4b298f58736dc4b5e4ff1bfe7fd2cf2e9939684797d354aeae404a68c94374cdacfc6fa67331440171c',
  ])
  .attr('leaves', [
    {
      label: 'BTC-USD',
      valueBytes: '0x6b62c4fdd53aa75cfc25b5b0e582b00e1c6c32769ee6b4ce38656687919c0145',
    },
  ])
  .attr('fcdKeys', ['btc-usd'])
  .attr('fcdValues', ['0xabctest'])
  .attr('dataTimestamp', 10);

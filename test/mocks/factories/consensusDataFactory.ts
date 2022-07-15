import {Factory} from 'rosie';
import {SaveConsensusDataProps} from '../../../src/repositories/ConsensusDataRepository';

export const consensusDataFactory = Factory.define<SaveConsensusDataProps>('ConsensusData')
  .attr('root', '0xabctest')
  .attr('chainIds', ['bsc'])
  .attr('signatures', ['signature1'])
  .attr('fcdKeys', ['btc-usd'])
  .attr('fcdValues', ['0xabctest'])
  .attr('timestamp', 10)
  .attr('timePadding', 1);

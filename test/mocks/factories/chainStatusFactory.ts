import {BigNumber} from 'ethers';
import {Factory} from 'rosie';

import {ChainStatus} from '../../../src/types/ChainStatus';

export const chainStatusFactory = Factory.define<ChainStatus>('LeavesAndFeeds')
  .attr('blockNumber', BigNumber.from(132153))
  .attr('timePadding', 1)
  .attr('lastBlockId', 1)
  .attr('nextBlockId', 1)
  .attr('nextLeader', '0xaebd')
  .attr('validators', ['0xabctest'])
  .attr('locations', ['abc'])
  .attr('lastDataTimestamp', 1)
  .attr('powers', [BigNumber.from(1)])
  .attr('staked', BigNumber.from(1))
  .attr('minSignatures', 1);

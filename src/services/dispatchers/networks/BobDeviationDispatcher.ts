import {injectable} from 'inversify';

import {ChainsIds} from '../../../types/ChainsIds.js';
import {DeviationDispatcher} from '../DeviationDispatcher.js';
import {BlockchainType} from '../../../types/Settings.js';

@injectable()
export class BobDeviationDispatcher extends DeviationDispatcher {
  readonly chainId = ChainsIds.BOB;
  readonly blockchainType = BlockchainType.ON_CHAIN;
}

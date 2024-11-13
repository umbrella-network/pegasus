import {injectable} from 'inversify';

import {ChainsIds} from '../../../types/ChainsIds.js';
import {DeviationDispatcher} from '../DeviationDispatcher.js';
import {BlockchainType} from '../../../types/Settings.js';

@injectable()
export class _5ireDeviationDispatcher extends DeviationDispatcher {
  readonly chainId = ChainsIds._5IRE;
  readonly blockchainType = BlockchainType.ON_CHAIN;
}

import {injectable} from 'inversify';

import {ChainsIds} from '../../../types/ChainsIds.js';
import {DeviationDispatcher} from '../DeviationDispatcher.js';
import {BlockchainType} from '../../../types/Settings.js';

@injectable()
export class OKXDeviationDispatcher extends DeviationDispatcher {
  readonly chainId = ChainsIds.OKX;
  readonly blockchainType = BlockchainType.ON_CHAIN;
}

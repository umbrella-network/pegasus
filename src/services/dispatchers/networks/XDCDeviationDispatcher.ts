import {injectable} from 'inversify';

import {ChainsIds} from '../../../types/ChainsIds.js';
import {DeviationDispatcher} from '../DeviationDispatcher.js';
import {BlockchainType} from '../../../types/Settings.js';

@injectable()
export class XDCDeviationDispatcher extends DeviationDispatcher {
  readonly chainId = ChainsIds.XDC;
  readonly blockchainType = BlockchainType.ON_CHAIN;
}

import {injectable} from 'inversify';

import {ChainsIds} from '../../../types/ChainsIds.js';
import {DeviationDispatcher} from '../DeviationDispatcher.js';
import {BlockchainType} from '../../../types/Settings.js';

@injectable()
export class LineaDeviationDispatcher extends DeviationDispatcher {
  readonly chainId = ChainsIds.LINEA;
  readonly blockchainType = BlockchainType.ON_CHAIN;
}

import {injectable} from 'inversify';
import {DeviationDispatcher} from '../DeviationDispatcher.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import {BlockchainType} from '../../../types/Settings.js';

@injectable()
export class BaseDeviationDispatcher extends DeviationDispatcher {
  readonly chainId = ChainsIds.BASE;
  readonly blockchainType = BlockchainType.ON_CHAIN;
}

import {injectable} from 'inversify';
import {DeviationDispatcher} from '../DeviationDispatcher';
import {ChainsIds} from '../../../types/ChainsIds';
import {BlockchainType} from '../../../types/Settings';

@injectable()
export class BaseDeviationDispatcher extends DeviationDispatcher {
  readonly chainId = ChainsIds.BASE;
  readonly blockchainType = BlockchainType.ON_CHAIN;
}

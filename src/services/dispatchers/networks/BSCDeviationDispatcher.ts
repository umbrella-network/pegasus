import {injectable} from 'inversify';
import {ChainsIds} from '../../../types/ChainsIds';
import {DeviationDispatcher} from '../DeviationDispatcher';
import {BlockchainType} from '../../../types/Settings';

@injectable()
export class BSCDeviationDispatcher extends DeviationDispatcher {
  readonly chainId = ChainsIds.BSC;
  readonly blockchainType = BlockchainType.ON_CHAIN;
}

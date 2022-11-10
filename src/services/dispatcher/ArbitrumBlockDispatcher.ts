import {injectable} from 'inversify';
import {BlockDispatcher} from './BlockDispatcher';
import {ChainsIds} from '../../types/ChainsIds';

@injectable()
export class ArbitrumBlockDispatcher extends BlockDispatcher {
  readonly chainId = ChainsIds.ARBITRUM;
}

import {injectable} from 'inversify';
import {NonEvmDeviationDispatcher} from './NonEvmDeviationDispatcher.js';
import {ChainsIds} from '../../../types/ChainsIds.js';

@injectable()
export class MultiversXDeviationDispatcher extends NonEvmDeviationDispatcher {
  readonly chainId = ChainsIds.MULTIVERSX;
}

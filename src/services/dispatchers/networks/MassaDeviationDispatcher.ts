import {injectable} from 'inversify';
import {NonEvmDeviationDispatcher} from './NonEvmDeviationDispatcher.js';
import {ChainsIds} from '../../../types/ChainsIds.js';

@injectable()
export class MassaDeviationDispatcher extends NonEvmDeviationDispatcher {
  readonly chainId = ChainsIds.MASSA;
}

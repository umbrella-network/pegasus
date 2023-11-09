import {injectable} from 'inversify';
import {NonEvmDeviationDispatcher} from './NonEvmDeviationDispatcher';
import {ChainsIds} from '../../../types/ChainsIds';

@injectable()
export class MassaDeviationDispatcher extends NonEvmDeviationDispatcher {
  readonly chainId = ChainsIds.MASSA;
}

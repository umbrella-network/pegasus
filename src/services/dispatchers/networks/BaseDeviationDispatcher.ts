import {injectable} from 'inversify';
import {DeviationDispatcher} from "../DeviationDispatcher";
import {ChainsIds} from '../../../types/ChainsIds';

@injectable()
export class BaseDeviationDispatcher extends DeviationDispatcher {
  readonly chainId = ChainsIds.BASE;
}

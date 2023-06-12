import {injectable} from 'inversify';
import {ChainsIds} from '../../../types/ChainsIds';
import {DeviationDispatcher} from "../DeviationDispatcher";

@injectable()
export class BSCDeviationDispatcher extends DeviationDispatcher {
  readonly chainId = ChainsIds.BSC;
}

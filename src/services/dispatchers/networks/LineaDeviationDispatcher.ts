import {injectable} from 'inversify';

import {ChainsIds} from '../../../types/ChainsIds';
import {DeviationDispatcher} from "../DeviationDispatcher";

@injectable()
export class LineaDeviationDispatcher extends DeviationDispatcher {
  readonly chainId = ChainsIds.LINEA;
}

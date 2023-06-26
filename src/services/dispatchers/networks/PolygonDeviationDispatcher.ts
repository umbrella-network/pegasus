import {injectable} from 'inversify';

import {ChainsIds} from '../../../types/ChainsIds';
import {DeviationDispatcher} from "../DeviationDispatcher";

@injectable()
export class PolygonDeviationDispatcher extends DeviationDispatcher {
  readonly chainId = ChainsIds.POLYGON;
}

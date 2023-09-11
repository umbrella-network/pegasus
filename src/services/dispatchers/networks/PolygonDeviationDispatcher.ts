import {injectable} from 'inversify';

import {ChainsIds} from '../../../types/ChainsIds';
import {DeviationDispatcher} from "../DeviationDispatcher";
import {BlockchainType} from "../../../types/Settings";

@injectable()
export class PolygonDeviationDispatcher extends DeviationDispatcher {
  readonly chainId = ChainsIds.POLYGON;
  readonly blockchainType = BlockchainType.ON_CHAIN;
}

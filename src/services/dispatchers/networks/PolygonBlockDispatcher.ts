import {injectable} from 'inversify';
import {BlockDispatcher} from '../BlockDispatcher';
import {ChainsIds} from '../../../types/ChainsIds';
import {BlockchainType} from "../../../types/Settings";

@injectable()
export class PolygonBlockDispatcher extends BlockDispatcher {
  readonly chainId = ChainsIds.POLYGON;
  readonly blockchainType = BlockchainType.LAYER2;
}

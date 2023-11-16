import {injectable} from 'inversify';
import {BlockDispatcher} from '../BlockDispatcher.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import {BlockchainType} from '../../../types/Settings.js';

@injectable()
export class PolygonBlockDispatcher extends BlockDispatcher {
  readonly chainId = ChainsIds.POLYGON;
  readonly blockchainType = BlockchainType.LAYER2;
}

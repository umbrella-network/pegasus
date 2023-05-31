import {injectable} from 'inversify';
import {BlockDispatcher} from '../BlockDispatcher';
import {ChainsIds} from '../../../types/ChainsIds';

@injectable()
export class PolygonBlockDispatcher extends BlockDispatcher {
  readonly chainId = ChainsIds.POLYGON;
}

import {injectable} from 'inversify';
import {BlockDispatcher} from '../BlockDispatcher';
import {ChainsIds} from '../../../types/ChainsIds';
import {BlockchainType} from '../../../types/Settings';

@injectable()
export class BSCBlockDispatcher extends BlockDispatcher {
  readonly chainId = ChainsIds.BSC;
  readonly blockchainType = BlockchainType.LAYER2;
}

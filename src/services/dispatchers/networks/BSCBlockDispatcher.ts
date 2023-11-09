import {injectable} from 'inversify';
import {BlockDispatcher} from '../BlockDispatcher.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import {BlockchainType} from '../../../types/Settings.js';

@injectable()
export class BSCBlockDispatcher extends BlockDispatcher {
  readonly chainId = ChainsIds.BSC;
  readonly blockchainType = BlockchainType.LAYER2;
}

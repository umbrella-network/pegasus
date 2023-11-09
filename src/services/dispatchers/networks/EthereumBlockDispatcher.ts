import {injectable} from 'inversify';
import {BlockDispatcher} from '../BlockDispatcher.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import {BlockchainType} from '../../../types/Settings.js';

@injectable()
export class EthereumBlockDispatcher extends BlockDispatcher {
  readonly chainId = ChainsIds.ETH;
  readonly blockchainType = BlockchainType.LAYER2;
}

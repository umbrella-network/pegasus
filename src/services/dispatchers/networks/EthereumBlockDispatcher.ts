import {injectable} from 'inversify';
import {BlockDispatcher} from '../BlockDispatcher';
import {ChainsIds} from '../../../types/ChainsIds';
import {BlockchainType} from '../../../types/Settings';

@injectable()
export class EthereumBlockDispatcher extends BlockDispatcher {
  readonly chainId = ChainsIds.ETH;
  readonly blockchainType = BlockchainType.LAYER2;
}

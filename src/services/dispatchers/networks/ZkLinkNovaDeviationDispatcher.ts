import {injectable} from 'inversify';

import {ChainsIds} from '../../../types/ChainsIds.js';
import {DeviationDispatcher} from '../DeviationDispatcher.js';
import {BlockchainType} from '../../../types/Settings.js';

@injectable()
export class ZkLinkNovaDeviationDispatcher extends DeviationDispatcher {
  readonly chainId = ChainsIds.ZK_LINK_NOVA;
  readonly blockchainType = BlockchainType.ON_CHAIN;
}

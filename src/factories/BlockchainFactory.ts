import {injectable} from 'inversify';

import {ChainsIds} from '../types/ChainsIds';
import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';

export interface BlockchainFactoryProps {
  chainId: ChainsIds;
  settings: Settings;
}

@injectable()
export class BlockchainFactory {
  static create(props: BlockchainFactoryProps): Blockchain {
    return new Blockchain(props.settings, props.chainId);
  }
}

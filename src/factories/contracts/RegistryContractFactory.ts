import {ContractRegistry} from '@umb-network/toolbox';

import Blockchain from '../../lib/Blockchain';
import {RegistryInterface} from '../../interfaces/RegistryInterface';
import {RegistryMultiversX} from '../../blockchains/multiversx/contracts/RegistryMultiversX';
import {ChainsIds} from '../../types/ChainsIds';
import {RegistryMassa} from '../../blockchains/massa/contracts/RegistryMassa';

export class RegistryContractFactory {
  static create(blockchain: Blockchain): RegistryInterface {
    switch (blockchain.chainId) {
      case ChainsIds.MULTIVERSX:
        return new RegistryMultiversX(blockchain);

      case ChainsIds.MASSA:
        return new RegistryMassa(blockchain);

      case ChainsIds.BSC:
      case ChainsIds.AVALANCHE:
      case ChainsIds.ARBITRUM:
      case ChainsIds.POLYGON:
      case ChainsIds.ETH:
      case ChainsIds.LINEA:
      case ChainsIds.BASE:
        return new ContractRegistry(blockchain.provider.getRawProvider(), blockchain.getContractRegistryAddress());

      default:
        throw new Error(`[RegistryContractFactory] ${blockchain.chainId} not supported`);
    }
  }
}

import {ContractRegistry} from '@umb-network/toolbox';

import Blockchain from '../../lib/Blockchain.js';
import {RegistryInterface} from '../../interfaces/RegistryInterface.js';
import {RegistryMultiversX} from '../../blockchains/multiversx/contracts/RegistryMultiversX.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import {RegistryMassa} from '../../blockchains/massa/contracts/RegistryMassa.js';
import {RegistryConcordium} from '../../blockchains/concordium/contracts/RegistryConcordium.js';

export class RegistryContractFactory {
  static create(blockchain: Blockchain): RegistryInterface {
    switch (blockchain.chainId) {
      case ChainsIds.MULTIVERSX:
        return new RegistryMultiversX(blockchain);

      case ChainsIds.MASSA:
        return new RegistryMassa(blockchain);

      case ChainsIds.CONCORDIUM:
        return new RegistryConcordium(blockchain);

      case ChainsIds.BSC:
      case ChainsIds.AVALANCHE:
      case ChainsIds.ARBITRUM:
      case ChainsIds.POLYGON:
      case ChainsIds.ETH:
      case ChainsIds.LINEA:
      case ChainsIds.BASE:
        return new ContractRegistry(blockchain.provider.getRawProviderSync(), blockchain.getContractRegistryAddress());

      default:
        throw new Error(`[RegistryContractFactory] ${blockchain.chainId} not supported`);
    }
  }
}

import {ContractRegistry} from "@umb-network/toolbox";

import Blockchain from "../../lib/Blockchain";
import {RegistryInterface} from "../../contracts/interfaces/RegistryInterface";
import {RegistryMultiversX} from "../../contracts/multiversx/RegistryMultiversX";
import {ChainsIds} from "../../types/ChainsIds";

export class RegistryContractFactory {
  static create(blockchain: Blockchain): RegistryInterface {
    switch (blockchain.chainId) {
      case ChainsIds.MULTIVERSX:
        return new RegistryMultiversX(blockchain);

      default:
        return new ContractRegistry(
          blockchain.provider.getRawProvider(),
          blockchain.getContractRegistryAddress(),
        );
    }
  }
}

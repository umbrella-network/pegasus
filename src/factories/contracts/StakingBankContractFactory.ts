import {StakingBankInterface} from "../../interfaces/StakingBankInterface";
import {StakingBankContract} from "../../blockchains/evm/contracts/StakingBankContract";
import Blockchain from "../../lib/Blockchain";
import {StakingBankMultiversX} from "../../blockchains/multiversx/contracts/StakingBankMultiversX";
import settings from "../../config/settings";
import {ChainsIds} from "../../types/ChainsIds";
import {StakingBankMassa} from "../../blockchains/massa/contracts/StakingBankMassa";

export class StakingBankContractFactory {
  static create(blockchain: Blockchain): StakingBankInterface {
    switch (blockchain.chainId) {
      case ChainsIds.MULTIVERSX:
        return new StakingBankMultiversX(blockchain, settings.blockchain.contracts.bank.name);

      case ChainsIds.MASSA:
        return new StakingBankMassa(blockchain, settings.blockchain.contracts.bank.name);

      case ChainsIds.BSC:
      case ChainsIds.AVALANCHE:
      case ChainsIds.ARBITRUM:
      case ChainsIds.POLYGON:
      case ChainsIds.ETH:
      case ChainsIds.LINEA:
      case ChainsIds.BASE:
        return new StakingBankContract(blockchain, settings.blockchain.contracts.bank.name);

      default:
        throw new Error(`[StakingBankContractFactory] ${blockchain.chainId} not supported`);
    }
  }
}

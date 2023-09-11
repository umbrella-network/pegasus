import {StakingBankInterface} from "../../contracts/interfaces/StakingBankInterface";
import {StakingBankContract} from "../../contracts/evm/StakingBankContract";
import Blockchain from "../../lib/Blockchain";
import {StakingBankMultiversX} from "../../contracts/multiversx/StakingBankMultiversX";
import settings from "../../config/settings";
import {ChainsIds} from "../../types/ChainsIds";

export class StakingBankContractFactory {
  static create(blockchain: Blockchain): StakingBankInterface {
    switch (blockchain.chainId) {
      case ChainsIds.MULTIVERSX:
        return new StakingBankMultiversX(blockchain, settings.blockchain.contracts.bank.name);

      default:
        return new StakingBankContract(blockchain, settings.blockchain.contracts.bank.name);
    }
  }
}

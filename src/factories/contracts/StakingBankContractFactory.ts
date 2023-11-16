import {StakingBankInterface} from '../../interfaces/StakingBankInterface.js';
import {StakingBankContract} from '../../blockchains/evm/contracts/StakingBankContract.js';
import Blockchain from '../../lib/Blockchain.js';
import {StakingBankMultiversX} from '../../blockchains/multiversx/contracts/StakingBankMultiversX.js';
import settings from '../../config/settings.js';
import {ChainsIds} from '../../types/ChainsIds.js';

export class StakingBankContractFactory {
  static create(blockchain: Blockchain): StakingBankInterface {
    switch (blockchain.chainId) {
      case ChainsIds.MULTIVERSX:
        return new StakingBankMultiversX(blockchain, settings.blockchain.contracts.bank.name);

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

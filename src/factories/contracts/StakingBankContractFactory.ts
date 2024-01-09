import {StakingBankInterface} from '../../interfaces/StakingBankInterface.js';
import {StakingBankContract} from '../../blockchains/evm/contracts/StakingBankContract.js';
import Blockchain from '../../lib/Blockchain.js';
import {StakingBankMultiversX} from '../../blockchains/multiversx/contracts/StakingBankMultiversX.js';
import settings from '../../config/settings.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import {StakingBankMassa} from '../../blockchains/massa/contracts/StakingBankMassa.js';
import {StakingBankConcordium} from '../../blockchains/concordium/contracts/StakingBankConcordium.js';

export class StakingBankContractFactory {
  static create(blockchain: Blockchain): StakingBankInterface {
    switch (blockchain.chainId) {
      case ChainsIds.MULTIVERSX:
        return new StakingBankMultiversX(blockchain, settings.blockchain.contracts.bank.name);

      case ChainsIds.MASSA:
        return new StakingBankMassa(blockchain, settings.blockchain.contracts.bank.name);

      case ChainsIds.CONCORDIUM:
        return new StakingBankConcordium(blockchain, settings.blockchain.contracts.bank.name);

      case ChainsIds.BSC:
      case ChainsIds.AVALANCHE:
      case ChainsIds.ARBITRUM:
      case ChainsIds.POLYGON:
      case ChainsIds.ETH:
      case ChainsIds.LINEA:
      case ChainsIds.BASE:
      case ChainsIds.AVAX_MELD:
      case ChainsIds.XDC:
      case ChainsIds.OKX:
        return new StakingBankContract(blockchain, settings.blockchain.contracts.bank.name);

      default:
        throw new Error(`[StakingBankContractFactory] ${blockchain.chainId} not supported`);
    }
  }
}

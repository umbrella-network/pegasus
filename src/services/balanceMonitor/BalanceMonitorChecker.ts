import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {ChainsIds} from '../../types/ChainsIds.js';
import Settings, {BlockchainType} from '../../types/Settings.js';
import {BalanceMonitorKeyResolver} from './BalanceMonitorKeyResolver.js';
import {MappingRepository} from '../../repositories/MappingRepository.js';
import {BlockchainRepository} from '../../repositories/BlockchainRepository.js';

@injectable()
export class BalanceMonitorChecker {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(MappingRepository) mappingRepository!: MappingRepository;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;

  async apply(blockchainType: BlockchainType): Promise<boolean> {
    const chainIds = this.chainKeys(blockchainType);

    const wallets = await Promise.all(chainIds.map((id) => this.walletForChainType(blockchainType, id)));

    const keysToCheck = chainIds
      .map((id, i) => {
        const wallet = wallets[i];
        if (!wallet) return;

        return BalanceMonitorKeyResolver.apply(id, wallet);
      })
      .filter((k) => !!k) as string[];

    const balancesDatas = await this.mappingRepository.getMany(keysToCheck);

    if (chainIds.length != Object.keys(balancesDatas).length) {
      const waitingFor = keysToCheck.filter((k) => !balancesDatas[k]).join(', ');
      this.logger.info(`[BalanceMonitorChecker] waiting for: ${waitingFor}`);
      // in case we do not have all chains balances yet, we do not perform checks in order to not lock out ourselves
      return true;
    }

    this.logger.debug(`[BalanceMonitorChecker] checking ${chainIds.join(', ')}`);

    return (
      Object.values(balancesDatas).filter((data) => {
        const {error} = JSON.parse(data);
        return !error;
      }).length > 0
    );
  }

  protected async walletForChainType(blockchainType: BlockchainType, chainId: ChainsIds): Promise<string | undefined> {
    const blockchain = this.blockchainRepository.get(chainId);

    return blockchainType == BlockchainType.LAYER2
      ? await blockchain.wallet.address()
      : await blockchain?.deviationWallet?.address();
  }

  protected chainKeys(blockchainType: BlockchainType): ChainsIds[] {
    return (Object.keys(this.settings.blockchain.multiChains) as ChainsIds[]).filter(
      (id) => this.settings.blockchain.multiChains[id]?.type.includes(blockchainType),
    );
  }
}

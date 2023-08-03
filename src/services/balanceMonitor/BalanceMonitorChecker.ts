import {inject, injectable} from 'inversify';
import {Logger} from "winston";

import {ChainsIds} from "../../types/ChainsIds";
import Settings, {BlockchainType} from "../../types/Settings";
import {BalanceMonitorKeyResolver} from "./BalanceMonitorKeyResolver";
import {MappingRepository} from "../../repositories/MappingRepository";

@injectable()
export class BalanceMonitorChecker {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(MappingRepository) mappingRepository!: MappingRepository;

  async apply(blockchainType: BlockchainType, wallet: string): Promise<boolean> {
    const chainIds = this.chainKeys(blockchainType);
    const keysToCheck = chainIds.map(id => BalanceMonitorKeyResolver.apply(id, wallet));
    const balancesDatas = await this.mappingRepository.getMany(keysToCheck);

    if (chainIds.length != Object.keys(balancesDatas).length) {
      const waitingFor = keysToCheck.filter(k => !balancesDatas[k]).join(', ');
      this.logger.info(`[BalanceMonitorChecker] waiting for: ${waitingFor}`);
      // in case we do not have all chains balances yet, we do not perform checks in order to not lock out ourselves
      return true;
    }

    this.logger.debug(`[BalanceMonitorChecker] checking ${chainIds.join(', ')}`);

    return Object.values(balancesDatas).filter(data => {
      const {error} = JSON.parse(data);
      return !error;
    }).length > 0;
  }

  protected chainKeys(blockchainType: BlockchainType): ChainsIds[] {
    return (Object.keys(this.settings.blockchain.multiChains) as ChainsIds[])
      .filter(id => this.settings.blockchain.multiChains[id]?.type.includes(blockchainType));
  }
}

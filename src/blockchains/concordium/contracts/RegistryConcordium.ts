import {Logger} from 'winston';

import Blockchain from '../../../lib/Blockchain.js';
import {RegistryInterface} from '../../../interfaces/RegistryInterface.js';
import * as RegistryContract from './generated/registry_registry.js';
import logger from '../../../lib/logger.js';
import {ConcordiumAddress} from '../utils/ConcordiumAddress.js';

export class RegistryConcordium implements RegistryInterface {
  protected logger!: Logger;
  protected loggerPrefix!: string;
  readonly blockchain!: Blockchain;
  protected registry!: RegistryContract.Type;

  constructor(blockchain: Blockchain) {
    this.blockchain = blockchain;
    this.loggerPrefix = '[RegistryConcordium]';
    this.logger = logger;

    this.beforeAnyAction().then(() => {
      this.logger.info(`${this.loggerPrefix} constructor done`);
    });
  }

  async getAddress(name: string): Promise<string> {
    await this.beforeAnyAction();

    try {
      const result = await RegistryContract.dryRunGetAddress(this.registry, name);
      const parsed = RegistryContract.parseReturnValueGetAddress(result);

      if (!parsed) return '';

      return ConcordiumAddress.toIndexedString(parsed);
    } catch (e) {
      this.logger.error(`${this.loggerPrefix} getAddress(${name}): ${(e as Error).message}`);
    }

    return '';
  }

  private async beforeAnyAction(): Promise<void> {
    if (this.registry) return;

    try {
      const contractAddress = ConcordiumAddress.fromIndexedString(this.blockchain.getContractRegistryAddress());
      this.registry = await RegistryContract.createUnchecked(
        this.blockchain.provider.getRawProviderSync(),
        contractAddress,
      );
    } catch (e) {
      this.logger.error(`${this.loggerPrefix} ${(e as Error).message}`);
    }
  }
}

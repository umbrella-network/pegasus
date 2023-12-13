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

    const result = await RegistryContract.dryRunGetAddress(this.registry, name);
    const parsed = RegistryContract.parseReturnValueGetAddress(result);

    if (!parsed) return '';

    return ConcordiumAddress.toIndexedString(parsed);
  }

  private async beforeAnyAction(): Promise<void> {
    if (this.registry) return;

    const contractAddress = ConcordiumAddress.fromIndexedString(this.blockchain.getContractRegistryAddress());
    this.registry = await RegistryContract.create(this.blockchain.provider.getRawProviderSync(), contractAddress);
  }
}

import {Args, Client} from '@massalabs/massa-web3';
import {Logger} from 'winston';

import Blockchain from '../../../lib/Blockchain';
import {RegistryInterface} from '../../../interfaces/RegistryInterface';
import logger from '../../../lib/logger';
import {MassaProvider} from '../MassaProvider';
import {ProviderInterface} from '../../../interfaces/ProviderInterface';

export class RegistryMassa implements RegistryInterface {
  protected logger!: Logger;
  protected loggerPrefix!: string;
  protected provider!: ProviderInterface;
  protected client!: Client;
  readonly registryAddress!: string;

  constructor(blockchain: Blockchain) {
    this.logger = logger;
    this.loggerPrefix = '[RegistryMassa]';
    this.provider = blockchain.provider;

    this.registryAddress = blockchain.getContractRegistryAddress();
  }

  async getAddress(name: string): Promise<string> {
    await this.beforeAnyAction();

    try {
      const res = await this.client.smartContracts().readSmartContract({
        maxGas: BigInt(10_000_000),
        targetAddress: this.registryAddress,
        targetFunction: 'getAddressByString',
        parameter: new Args().addString(name).serialize(),
      });

      return new Args(res.returnValue).nextString();
    } catch (e) {
      this.logger.warn(`${this.loggerPrefix} contract ${name} is not in registry`);
    }

    return '';
  }

  private async beforeAnyAction() {
    if (this.client) return;

    await (this.provider as MassaProvider).beforeAnyAction();
    this.client = this.provider.getRawProvider();
  }
}

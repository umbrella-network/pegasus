import {BigNumber} from 'ethers';
import {Logger} from 'winston';
import {Args, ArrayTypes, Client} from '@massalabs/massa-web3';

import {RegistryContractFactory} from '../../../factories/contracts/RegistryContractFactory.js';
import Blockchain from '../../../lib/Blockchain.js';
import {Validator} from '../../../types/Validator.js';
import {StakingBankInterface} from '../../../interfaces/StakingBankInterface.js';
import {RegistryInterface} from '../../../interfaces/RegistryInterface.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import logger from '../../../lib/logger.js';
import {ProviderInterface} from '../../../interfaces/ProviderInterface.js';

export class StakingBankMassa implements StakingBankInterface {
  protected logger!: Logger;
  protected loggerPrefix!: string;
  protected provider!: ProviderInterface;
  protected client!: Client;
  readonly registry!: RegistryInterface;
  readonly bankName!: string;

  constructor(blockchain: Blockchain, bankName = 'StakingBank') {
    this.logger = logger;
    this.loggerPrefix = '[StakingBankMassa]';

    this.bankName = bankName;
    this.provider = blockchain.provider;
    this.registry = RegistryContractFactory.create(blockchain);

    this.beforeAnyAction().then(() => {
      this.logger.info(`${this.loggerPrefix} constructor done`);
    });
  }

  async address(): Promise<string> {
    return this.resolveBankAddress();
  }

  chainId(): string {
    return ChainsIds.MASSA;
  }

  async resolveValidators(): Promise<Validator[]> {
    const addresses = await this.resolveValidatorsAddresses();
    return Promise.all(addresses.map((address) => this.getValidator(address)));
  }

  balanceOf(): Promise<bigint> {
    throw new Error(`${this.loggerPrefix} balanceOf not implemented`);
  }

  verifyValidators(): Promise<boolean> {
    throw new Error(`${this.loggerPrefix} verifyValidators not implemented`);
  }

  protected resolveBankAddress = async (): Promise<string> => {
    return this.registry.getAddress(this.bankName);
  };

  async getNumberOfValidators(): Promise<number> {
    return this.numberOfValidators();
  }

  protected async numberOfValidators(): Promise<number> {
    throw new Error(`${this.loggerPrefix} getNumberOfValidators not implemented`);
  }

  protected async getValidator(validatorAddress: string): Promise<Validator> {
    const parameter = new Args().addString(validatorAddress).addString(validatorAddress).serialize();
    const res = await this.rawCall('validators', parameter);
    const args = new Args(res);

    return <Validator>{
      id: args.nextString(),
      power: BigNumber.from(1),
      location: args.nextString(),
    };
  }

  protected async resolveValidatorsAddresses(): Promise<string[]> {
    const res = await this.rawCall('getAddresses');
    return new Args(res).nextArray(ArrayTypes.STRING);
  }

  protected async rawCall(targetFunction: string, parameter: Array<number> | Args = []): Promise<Uint8Array> {
    await this.beforeAnyAction();
    const targetAddress = await this.resolveBankAddress();

    const res = await this.client.smartContracts().readSmartContract({
      maxGas: BigInt(10_000_000),
      targetAddress: targetAddress,
      targetFunction: targetFunction,
      parameter: parameter,
    });

    return res.returnValue;
  }

  private async beforeAnyAction() {
    if (this.client) return;

    this.client = await this.provider.getRawProvider();
  }
}

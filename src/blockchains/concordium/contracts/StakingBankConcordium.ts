import {BigNumber} from 'ethers';
import {Logger} from 'winston';
import {HexString, Parameter} from '@concordium/web-sdk';

import * as BankContract from './generated/staking_bank_staking_bank.js';

import {RegistryContractFactory} from '../../../factories/contracts/RegistryContractFactory.js';
import Blockchain from '../../../lib/Blockchain.js';
import {Validator} from '../../../types/Validator.js';
import {StakingBankInterface} from '../../../interfaces/StakingBankInterface.js';
import logger from '../../../lib/logger.js';
import {RegistryInterface} from '../../../interfaces/RegistryInterface';
import {ConcordiumAddress} from '../utils/ConcordiumAddress.js';

export class StakingBankConcordium implements StakingBankInterface {
  readonly bankName!: string;
  readonly blockchain!: Blockchain;
  readonly registry!: RegistryInterface;

  protected logger!: Logger;
  protected loggerPrefix!: string;

  constructor(blockchain: Blockchain, bankName = 'StakingBank') {
    this.loggerPrefix = '[StakingBankConcordium]';
    this.logger = logger;

    this.bankName = bankName;
    this.blockchain = blockchain;
    this.registry = RegistryContractFactory.create(blockchain);
  }

  async address(): Promise<string> {
    return this.registry.getAddress(this.bankName);
  }

  chainId(): string {
    return this.blockchain.chainId;
  }

  async resolveValidators(): Promise<Validator[]> {
    const bank = await this.resolveContract();
    const addresses = await this.resolveValidatorsAddresses(bank);
    return Promise.all(addresses.map((address) => this.getValidator(bank, address)));
  }

  async getNumberOfValidators(): Promise<number> {
    const bank = await this.resolveContract();

    const result = await BankContract.dryRunGetNumberOfValidators(bank, Parameter.empty());
    const parsed = BankContract.parseReturnValueGetNumberOfValidators(result);

    if (!parsed && result.tag == 'failure') throw new Error(`${this.loggerPrefix} getNumberOfValidators failed`);

    return parsed ? Number(parsed) : 0;
  }

  async balanceOf(validatorAddress: HexString): Promise<bigint> {
    const bank = await this.resolveContract();
    const results = await BankContract.dryRunBalanceOf(bank, validatorAddress);
    const parsed = BankContract.parseReturnValueBalanceOf(results);

    if (!parsed && results.tag == 'failure') throw new Error(`${this.loggerPrefix} balanceOf failed`);

    return parsed ? BigInt(parsed.toString()) : 0n;
  }

  async verifyValidators(hexAddresses: HexString[]): Promise<boolean> {
    const bank = await this.resolveContract();
    const results = await BankContract.dryRunVerifyValidators(bank, hexAddresses);
    const parsed = BankContract.parseReturnValueVerifyValidators(results);

    if (!parsed && results.tag == 'failure') throw new Error(`${this.loggerPrefix} verifyValidators failed`);

    return !!parsed;
  }

  protected async getValidator(bank: BankContract.Type, validatorAddress: string): Promise<Validator> {
    const results = await BankContract.dryRunValidators(bank, validatorAddress);
    const parsed = BankContract.parseReturnValueValidators(results);
    if (!parsed) throw new Error(`${this.loggerPrefix} getValidator failed`);

    const [id, location] = parsed;

    return {
      id,
      power: BigNumber.from(1),
      location,
    };
  }

  protected async resolveValidatorsAddresses(bank: BankContract.Type): Promise<string[]> {
    const result = await BankContract.dryRunGetPublicKeys(bank, Parameter.empty());
    const parsed = BankContract.parseReturnValueGetPublicKeys(result);

    if (!parsed) throw new Error(`${this.loggerPrefix} resolveValidatorsAddresses failed`);

    return parsed;
  }

  private resolveContract = async (): Promise<BankContract.Type> => {
    const bankAddress = await this.registry.getAddress(this.bankName);
    this.logger.info(`${this.loggerPrefix} bank: ${bankAddress}`);

    const contractAddress = ConcordiumAddress.fromIndexedString(bankAddress);
    return BankContract.createUnchecked(this.blockchain.provider.getRawProviderSync(), contractAddress);
  };
}

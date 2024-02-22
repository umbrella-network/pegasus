import {
  Address,
  ContractFunction,
  Interaction,
  ResultsParser,
  SmartContract,
  AbiRegistry,
  AddressValue,
  Struct,
} from '@multiversx/sdk-core';
import {ApiNetworkProvider} from '@multiversx/sdk-network-providers';
import {BigNumber} from 'ethers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import path from 'path';

import {RegistryContractFactory} from '../../../factories/contracts/RegistryContractFactory.js';
import Blockchain from '../../../lib/Blockchain.js';
import {Validator} from '../../../types/Validator.js';
import {StakingBankInterface} from '../../../interfaces/StakingBankInterface.js';
import {RegistryInterface} from '../../../interfaces/RegistryInterface.js';
import {MultiversXAddress} from '../utils/MultiversXAddress.js';
import {MultiversXAbi} from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class StakingBankMultiversX implements StakingBankInterface {
  readonly bankAbi!: MultiversXAbi;
  readonly bankName!: string;
  readonly blockchain!: Blockchain;
  registry!: RegistryInterface;

  constructor(blockchain: Blockchain, bankName = 'StakingBank') {
    this.bankName = bankName;
    this.blockchain = blockchain;
    this.bankAbi = JSON.parse(readFileSync(__dirname + '/staking-bank.abi.json', 'utf-8'));
  }

  async address(): Promise<string> {
    const contract = await this.resolveContract();
    return contract.getAddress().bech32();
  }

  chainId(): string {
    return this.blockchain.chainId;
  }

  async resolveValidators(): Promise<Validator[]> {
    const bank = await this.resolveContract();
    const addresses = await this.resolveValidatorsAddresses(bank);
    return Promise.all(addresses.map((address) => this.getValidator(bank, address)));
  }

  async balanceOf(validator: string): Promise<bigint> {
    const bank = await this.resolveContract();

    const query = new Interaction(bank, new ContractFunction('balanceOf'), [
      MultiversXAddress.toAddressValue(validator),
    ]).buildQuery();

    const response = await this.blockchain.provider.getRawProviderSync<ApiNetworkProvider>().queryContract(query);

    const endpointDefinition = AbiRegistry.create(this.bankAbi).getEndpoint('balanceOf');
    const parsedResponse = new ResultsParser().parseQueryResponse(response, endpointDefinition);

    return BigInt(parsedResponse.values[0].toString());
  }

  async verifyValidators(validators: string[]): Promise<boolean> {
    const bank = await this.resolveContract();

    const query = new Interaction(
      bank,
      new ContractFunction('verifyValidators'),
      validators.map((v) => MultiversXAddress.toAddressValue(v)),
    ).buildQuery();

    const response = await this.blockchain.provider.getRawProviderSync<ApiNetworkProvider>().queryContract(query);

    const endpointDefinition = AbiRegistry.create(this.bankAbi).getEndpoint('verifyValidators');
    const parsedResponse = new ResultsParser().parseQueryResponse(response, endpointDefinition);

    return parsedResponse.values[0].valueOf();
  }

  protected resolveContract = async (): Promise<SmartContract> => {
    if (!this.registry) {
      this.registry = RegistryContractFactory.create(this.blockchain);
    }

    const bankAddress = await this.registry.getAddress(this.bankName);
    return new SmartContract({address: new Address(bankAddress)});
  };

  async getNumberOfValidators(): Promise<number> {
    const contract = await this.resolveContract();
    return this.numberOfValidators(contract);
  }

  protected async numberOfValidators(bank: SmartContract): Promise<number> {
    const query = new Interaction(bank, new ContractFunction('getNumberOfValidators'), []).buildQuery();
    const response = await this.blockchain.provider.getRawProviderSync<ApiNetworkProvider>().queryContract(query);

    const endpointDefinition = AbiRegistry.create(this.bankAbi).getEndpoint('getNumberOfValidators');
    const parsedResponse = new ResultsParser().parseQueryResponse(response, endpointDefinition);

    return parseInt(parsedResponse.values[0].toString(), 10);
  }

  protected async getValidator(bank: SmartContract, validatorAddress: string): Promise<Validator> {
    const query = new Interaction(bank, new ContractFunction('validators'), [
      MultiversXAddress.toAddressValue(validatorAddress),
    ]).buildQuery();

    const response = await this.blockchain.provider.getRawProviderSync<ApiNetworkProvider>().queryContract(query);
    const endpointDefinition = AbiRegistry.create(this.bankAbi).getEndpoint('validators');
    const parsedResponse = new ResultsParser().parseQueryResponse(response, endpointDefinition);

    const [id, location] = (parsedResponse.values[0] as unknown as Struct).getFields();

    return <Validator>{
      id: MultiversXAddress.fromAddressValue(id.value as AddressValue),
      power: BigNumber.from(1),
      location: location.value.toString(),
    };
  }

  protected async resolveValidatorsAddresses(contract: SmartContract): Promise<string[]> {
    const provider = this.blockchain.provider.getRawProviderSync<ApiNetworkProvider>();
    // const proxy = new ProxyNetworkProvider('https://devnet-gateway.multiversx.com');
    const query = new Interaction(contract, new ContractFunction('addresses'), []).buildQuery();
    const response = await provider.queryContract(query);
    // const response = await proxy.queryContract(query);
    const responseParsed = new ResultsParser().parseUntypedQueryResponse(response);

    return responseParsed.values.map((data) => new Address(data).bech32());
  }
}

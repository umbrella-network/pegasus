import {Address, ContractFunction, Interaction, ResultsParser, SmartContract, StringValue} from '@multiversx/sdk-core';
import {ApiNetworkProvider} from '@multiversx/sdk-network-providers';
// import {ProxyNetworkProvider} from "@multiversx/sdk-network-providers/out";
import Blockchain from '../../../lib/Blockchain.js';
import {RegistryInterface} from '../../../interfaces/RegistryInterface.js';

export class RegistryMultiversX implements RegistryInterface {
  readonly blockchain!: Blockchain;
  protected registry!: SmartContract;

  constructor(blockchain: Blockchain) {
    this.blockchain = blockchain;

    this.registry = new SmartContract({address: new Address(blockchain.getContractRegistryAddress())});
  }

  async getAddress(name: string): Promise<string> {
    // const proxy = new ProxyNetworkProvider('https://devnet-gateway.multiversx.com');

    const query = new Interaction(this.registry, new ContractFunction('getAddressByString'), [
      new StringValue(name),
    ]).buildQuery();
    const response = await this.blockchain.provider.getRawProviderSync<ApiNetworkProvider>().queryContract(query);
    // const response = await proxy.queryContract(query);
    const parsedResponse = new ResultsParser().parseUntypedQueryResponse(response);

    return Address.fromBuffer(parsedResponse.values[0]).bech32();
  }
}

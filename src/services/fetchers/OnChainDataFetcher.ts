import {ethers} from 'ethers';
import {inject, injectable} from 'inversify';

import {BlockchainRepository} from '../../repositories/BlockchainRepository.js';
import {ChainsIds, NonEvmChainsIds} from '../../types/ChainsIds.js';
import {BlockchainProviderRepository} from '../../repositories/BlockchainProviderRepository.js';
import {OnChainDataRepository} from '../../repositories/fetchers/OnChainDataRepository.js';
import {FetcherName} from '../../types/fetchers.js';

export interface OnChainDataInputParams {
  chainId?: ChainsIds; // default ETH
  address: string;
  method: string;
  inputs: string[]; // array of types
  outputs: string[]; // array of types
  args: string[];
  returnIndex?: number; // id/index of on-chain returned data that should be used as returned value
  decimals?: number; // decimals of returned number, if undefined will be returned as string
}

@injectable()
export class OnChainDataFetcher {
  @inject(OnChainDataRepository) onChainDataRepository!: OnChainDataRepository;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;
  @inject(BlockchainProviderRepository) blockchainProviderRepository!: BlockchainProviderRepository;

  private logPrefix = `[${FetcherName.OnChainData}]`;

  async apply(params: OnChainDataInputParams): Promise<string | number> {
    const timestamp = await this.fetchData(params);
    const data = await this.onChainDataRepository.getData([params], timestamp);

    if (params.decimals === undefined) {
      return ethers.BigNumber.from(data).toString();
    }

    const one = 10 ** params.decimals;
    return ethers.BigNumber.from(data).toNumber() / one;
  }

  private async fetchData(params: OnChainDataInputParams): Promise<number> {
    const provider = this.resolveBlockchainProvider(params.chainId);

    const [data, block] = await Promise.all([
      provider.call({to: params.address, data: OnChainDataFetcher.callData(params)}),
      provider.getBlock('latest'),
    ]);

    const returnedValues = ethers.utils.defaultAbiCoder.decode(params.outputs, data);

    await this.onChainDataRepository.save([
      {
        params,
        value: returnedValues[params?.returnIndex || 0],
        timestamp: block.timestamp,
      },
    ]);

    return block.timestamp;
  }

  private resolveBlockchainProvider(chainId: ChainsIds | undefined): ethers.providers.StaticJsonRpcProvider {
    if (chainId) {
      if (NonEvmChainsIds.includes(chainId)) throw new Error(`${this.logPrefix} ${chainId} not supported`);

      const blockchain = this.blockchainRepository.get(chainId);

      if (blockchain) {
        return blockchain.provider.getRawProviderSync();
      }

      if (chainId !== ChainsIds.ETH) throw new Error(`${this.logPrefix} chainId:${chainId} is not supported`);
    }

    const ethProvider = this.blockchainProviderRepository.get(ChainsIds.ETH);

    if (!ethProvider) throw new Error(`${this.logPrefix} chainId:${chainId} is not found`);

    return ethProvider;
  }

  private static callData(params: OnChainDataInputParams): string {
    const abi = [
      {
        name: params.method,
        type: 'function',
        stateMutability: 'view',
        inputs: params.inputs.map((type) => {
          return {type};
        }),
        outputs: params.outputs.map((type) => {
          return {type};
        }),
      },
    ];

    const iface = new ethers.utils.Interface(abi);
    return iface.encodeFunctionData(params.method, params.args);
  }
}

export default OnChainDataFetcher;

import {ethers} from 'ethers';
import {inject, injectable} from 'inversify';

import {BlockchainRepository} from '../../repositories/BlockchainRepository.js';
import {ChainsIds, NonEvmChainsIds} from '../../types/ChainsIds.js';
import {BlockchainProviderRepository} from '../../repositories/BlockchainProviderRepository.js';

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
class OnChainDataFetcher {
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;
  @inject(BlockchainProviderRepository) blockchainProviderRepository!: BlockchainProviderRepository;

  async apply(params: OnChainDataInputParams): Promise<string | number> {
    const data = await this.fetchData(params);

    if (params.decimals === undefined) {
      return ethers.BigNumber.from(data).toString();
    }

    const one = 10 ** params.decimals;
    return ethers.BigNumber.from(data).toNumber() / one;
  }

  private async fetchData(params: OnChainDataInputParams): Promise<string> {
    const provider = this.resolveBlockchainProvider(params.chainId);

    const data = await provider.call({
      to: params.address,
      data: OnChainDataFetcher.callData(params),
    });

    const returnedValues = ethers.utils.defaultAbiCoder.decode(params.outputs, data);
    return returnedValues[params?.returnIndex || 0];
  }

  private resolveBlockchainProvider(chainId: ChainsIds | undefined): ethers.providers.StaticJsonRpcProvider {
    if (chainId) {
      if (NonEvmChainsIds.includes(chainId)) throw new Error(`[OnChainDataFetcher] ${chainId} not supported`);

      const blockchain = this.blockchainRepository.get(chainId);

      if (blockchain) {
        return blockchain.provider.getRawProviderSync();
      }

      if (chainId !== ChainsIds.ETH) throw new Error(`[OnChainDataFetcher] chainId:${chainId} is not supported`);
    }

    const ethProvider = this.blockchainProviderRepository.get(ChainsIds.ETH);

    if (!ethProvider) throw new Error(`[OnChainDataFetcher] chainId:${chainId} is not found`);

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

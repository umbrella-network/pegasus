import {ethers} from 'ethers';
import {inject, injectable} from 'inversify';

import {OnChainCall} from '../../types/Feed';
import {BlockchainRepository} from "../../repositories/BlockchainRepository";
import {ChainsIds, NonEvmChainsIds} from "../../types/ChainsIds";
import {BlockchainProviderRepository} from "../../repositories/BlockchainProviderRepository";
import {Logger} from "winston";

@injectable()
class OnChainDataFetcher {
  @inject('Logger') logger!: Logger;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;
  @inject(BlockchainProviderRepository) blockchainProviderRepository!: BlockchainProviderRepository;

  async apply(params: OnChainCall): Promise<string | number> {
    const data = await this.fetchData(params);

    if (params.decimals === undefined) {
      return ethers.BigNumber.from(data).toString();
    }

    const one = 10 ** params.decimals;
    return ethers.BigNumber.from(data).toNumber() / one;
  }

  private async fetchData(params: OnChainCall): Promise<string> {
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
        return blockchain.provider.getRawProvider();
      }

      if (chainId !== ChainsIds.ETH) throw new Error(`[OnChainDataFetcher] chainId:${chainId} is not supported`);
    }

    const ethProvider = this.blockchainProviderRepository.get(ChainsIds.ETH);

    if (!ethProvider) throw new Error(`[OnChainDataFetcher] chainId:${chainId} is not found`);

    return ethProvider;
  }

  private static callData(params: OnChainCall): string {
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

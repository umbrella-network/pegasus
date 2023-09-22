import {inject, injectable} from 'inversify';
import {BigNumber, ethers} from 'ethers';
import {BaseProvider} from "@ethersproject/providers";

import BlockChainProviderFactory from '../BlockChainProviderFactory';

import YearnVaultExplorer from './YearnVaultExplorer.json';
import {ChainsIds} from "../../types/ChainsIds";
import {ProviderRepository} from "../../repositories/ProviderRepository";

@injectable()
class YearnVaultTokenPriceFetcher {
  @inject(BlockChainProviderFactory) blockChainProviderFactory!: BlockChainProviderFactory;
  @inject(ProviderRepository) protected providerRepository!: ProviderRepository;

  async apply(params: any): Promise<any> {
    const {network, address} = params;

    const provider = network
      ? this.blockChainProviderFactory.apply(network)
      : this.providerRepository.get(ChainsIds.ETH).getRawProvider<BaseProvider>();

    const contract = new ethers.Contract(address, YearnVaultExplorer, provider);

    const {tokens, vaults} = await contract.exploreByTokenIndex(0, 10000);

    const result: Vault[] = [];

    const numTokens = tokens.length;
    for (let i = 0, k = 0; i < numTokens; ++i) {
      const numVaults = tokens[i].numVaults.toNumber();

      for (let j = 0; j < numVaults; ++j, ++k) {
        result.push({
          tokenAddress: tokens[i],
          tokenSymbol: tokens[i].symbol,
          tokenDecimals: tokens[i].decimals.toNumber(),
          tokenVirtualPrice: tokens[i].virtualPrice || BigNumber.from(0),
          address: vaults[k].addr,
          decimals: vaults[k].decimals.toNumber(),
          symbol: vaults[k].symbol,
          totalAssets: vaults[k].totalAssets,
          pricePerShare: vaults[k].pricePerShare,
        });
      }
    }

    return result;
  }
}

export interface Vault {
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenVirtualPrice: BigNumber;
  address: string;
  decimals: number;
  symbol: string;
  totalAssets: BigNumber;
  pricePerShare: BigNumber;
}

export default YearnVaultTokenPriceFetcher;

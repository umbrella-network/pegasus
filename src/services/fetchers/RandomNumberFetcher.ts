import {utils} from 'ethers';
import {inject, injectable} from 'inversify';
import {BaseProvider} from "@ethersproject/providers";
import {ChainsIds} from "../../types/ChainsIds";
import {ProviderRepository} from "../../repositories/ProviderRepository";

@injectable()
class RandomNumberFetcher {
  @inject(ProviderRepository) protected providerRepository!: ProviderRepository;

  async apply({numBlocks = 10} = {}, timestamp: number): Promise<string> {
    const evmProvider = this.providerRepository.get(ChainsIds.POLYGON).getRawProvider<BaseProvider>();
    let latest = await evmProvider.getBlock('latest');

    while (latest.timestamp >= timestamp) {
      latest = await evmProvider.getBlock(latest.number - 1);
    }

    const blocks = await Promise.all(
      [...new Array(numBlocks - 1)].map((_, i) => evmProvider.getBlock(latest.number - numBlocks + i + 1)),
    );

    blocks.push(latest);

    return utils.keccak256(
      utils.defaultAbiCoder.encode(
        blocks.map(() => 'bytes32'),
        blocks.map((block) => block.hash),
      ),
    );
  }
}

export default RandomNumberFetcher;

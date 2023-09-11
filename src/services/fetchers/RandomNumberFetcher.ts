import {utils} from 'ethers';
import {injectable} from 'inversify';
import {BaseProvider} from "@ethersproject/providers";
import {ChainsIds} from "../../types/ChainsIds";
import {ProviderFactory} from "../../factories/ProviderFactory";

@injectable()
class RandomNumberFetcher {
  async apply({numBlocks = 10} = {}, timestamp: number): Promise<string> {
    const evmProvider = ProviderFactory.create(ChainsIds.POLYGON).getRawProvider<BaseProvider>();
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

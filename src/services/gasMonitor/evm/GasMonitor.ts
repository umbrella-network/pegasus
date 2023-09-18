import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {StaticJsonRpcProvider} from "@ethersproject/providers";

import {ProviderRepository} from "../../../repositories/ProviderRepository";
import {BlockchainGasRepository} from "../../../repositories/BlockchainGasRepository";
import {BlockchainGasCalculator} from "./BlockchainGasCalculator";
import {ChainsIds} from "../../../types/ChainsIds";
import Settings from "../../../types/Settings";
import {TwapFeedDetector} from "./TwapFeedDetector";

@injectable()
export class GasMonitor {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(ProviderRepository) protected providerRepository!: ProviderRepository;
  @inject(BlockchainGasRepository) protected gasRepository!: BlockchainGasRepository;
  @inject(BlockchainGasCalculator) protected gasCalculator!: BlockchainGasCalculator;
  @inject(TwapFeedDetector) twapFeedDetector!: TwapFeedDetector;

  async apply(chainId: ChainsIds): Promise<void> {
    if (!await this.twapFeedDetector.apply(chainId)) return;

    const blocks = await this.getListOfBlocksToPull(chainId);

    this.logger.info(`[${chainId}] GasMonitor blocks ${blocks}`);

    // in order to not abuse RPC we will fetch one by one
    for (let i = 0; i < blocks.length; i++) {
      this.logger.info(`[${chainId}] GasMonitor fetching block ${blocks[i]}`);
      const gasData = await this.gasCalculator.apply(chainId, blocks[i]);

      if (!gasData) {
        this.logger.info(`[${chainId}] GasMonitor no gas data @${blocks[i]}`);
        continue;
      }

      this.logger.info(`[${chainId}] GasMonitor got ${gasData.gas}@${gasData.blockNumber}`);
      await this.gasRepository.save(gasData);
    }
  }

  protected async getListOfBlocksToPull(chainId: ChainsIds): Promise<number[]> {
    const provider: StaticJsonRpcProvider = this.providerRepository.get(chainId).getRawProvider();

    const [currentBlock, lastGas] = await Promise.all([
      provider.getBlockNumber(),
      this.gasRepository.last(chainId)
    ]);

    const nth = this.nthBlock(chainId);
    const first = currentBlock - (currentBlock % nth);
    const last = lastGas ? lastGas.blockNumber : 0;

    const blocks: number[] = [];

    for (let i = 0; i < 20; i++) {
      const bn = first - nth * i;
      if (bn <= last) break;

      blocks.push(bn);
    }

    return blocks.reverse().slice(0, 5); // limit 5 per execution
  }

  protected nthBlock(chainId: ChainsIds): number {
    switch (chainId) {
      case ChainsIds.POLYGON: return this.calculateNthBlock(chainId, 2);
      case ChainsIds.ARBITRUM: return this.calculateNthBlock(chainId, 0.5);
      default: throw new Error(`nthBlock not set for ${chainId}`);
    }
  }

  protected calculateNthBlock(chainId: ChainsIds, blockTimeSec: number): number {
    const interval = this.blockIntervalConfig(chainId);
    if (interval) return interval;

    // target is to have observation every ~50 sec (under a minute)
    return Math.floor(50 / blockTimeSec);
  }

  protected blockIntervalConfig(chainId: ChainsIds): number | undefined {
    return this.settings.blockchain.multiChains[chainId]?.gasPriceCheckBlocksInterval;
  }
}

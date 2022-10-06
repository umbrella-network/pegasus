import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

import ConsensusRunner from './ConsensusRunner';
import BlockRepository from './BlockRepository';
import SignatureCollector from './SignatureCollector';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import TimeService from './TimeService';
import ChainContract from '../contracts/ChainContract';
import Blockchain from '../lib/Blockchain';
import Settings from '../types/Settings';
import {MultiChainStatusResolver} from './multiChain/MultiChainStatusResolver';
import {ConsensusDataRepository} from '../repositories/ConsensusDataRepository';
import {MultiChainStatusProcessor} from './multiChain/MultiChainStatusProcessor';
import {ChainStatus} from '../types/ChainStatus';
import {MultichainArchitectureDetector} from './MultichainArchitectureDetector';
import {ChainsIds} from '../types/ChainsIds';

@injectable()
class BlockMinter {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ChainContract) chainContract!: ChainContract;
  @inject(ConsensusRunner) consensusRunner!: ConsensusRunner;
  @inject(MultiChainStatusResolver) multiChainStatusResolver!: MultiChainStatusResolver;
  @inject(MultiChainStatusProcessor) multiChainStatusProcessor!: MultiChainStatusProcessor;
  @inject(TimeService) timeService!: TimeService;
  @inject(SignatureCollector) signatureCollector!: SignatureCollector;
  @inject(SortedMerkleTreeFactory) sortedMerkleTreeFactory!: SortedMerkleTreeFactory;
  @inject(BlockRepository) blockRepository!: BlockRepository;
  @inject(ConsensusDataRepository) consensusDataRepository!: ConsensusDataRepository;
  @inject(MultichainArchitectureDetector) multichainArchitectureDetector!: MultichainArchitectureDetector;
  @inject('Settings') settings!: Settings;

  async apply(): Promise<void> {
    await this.blockchain.setLatestProvider();
    const dataTimestamp = this.timeService.apply(this.settings.dataTimestampOffsetSeconds);

    const {chainsStatuses, chainsIdsReadyForBlock, nextLeader} = await this.multiChainStatusResolver.apply(
      dataTimestamp,
    );

    if (chainsStatuses.length === 0) {
      const message = '[BlockMinter] No chain status resolved.';
      this.logger.error(message);
      throw Error(message);
    }

    if (chainsIdsReadyForBlock.length === 0) {
      this.logger.info(`[BlockMinter] None of the chains is ready for data at ${dataTimestamp}...`);
      return;
    }

    const masterChainStatus = this.multiChainStatusProcessor.findMasterChain(chainsStatuses);

    if (!(await this.isLeader(nextLeader, dataTimestamp, masterChainStatus))) return;

    this.logger.info(`Starting consensus at: ${dataTimestamp}`);

    const validators = this.chainContract.resolveValidators(masterChainStatus);

    const consensus = await this.consensusRunner.apply(
      dataTimestamp,
      validators,
      masterChainStatus.staked,
      masterChainStatus.minSignatures,
    );

    if (!consensus) {
      this.logger.warn(`No consensus for block ${masterChainStatus.blockNumber} at ${dataTimestamp}`);
      return;
    }

    await this.consensusDataRepository.save({
      ...consensus,
      chainIds: chainsIdsReadyForBlock,
      timePadding: masterChainStatus.timePadding,
    });

    this.logger.info(`consensus for ${dataTimestamp} successful`);
  }

  private async isLeader(nextLeader: string, dataTimestamp: number, masterChainStatus: ChainStatus): Promise<boolean> {
    // TODO remove after update all external validators to 7.4.3
    if (!(await this.multichainArchitectureDetector.apply(ChainsIds.BSC))) {
      return this.isLeaderLegacy(masterChainStatus);
    }

    this.logger.info(
      `Next leader for ${dataTimestamp}: ${nextLeader}, ${nextLeader === this.blockchain.wallet.address}`,
    );

    return nextLeader === this.blockchain.wallet.address;
  }

  private isLeaderLegacy(chainStatus: ChainStatus): boolean {
    const {blockNumber, nextBlockId, nextLeader} = chainStatus;

    this.logger.info(
      `[OLD] Next leader for ${blockNumber}/${nextBlockId}: ${nextLeader}, ${
        nextLeader === this.blockchain.wallet.address
      }`,
    );

    return nextLeader === this.blockchain.wallet.address;
  }
}

export default BlockMinter;

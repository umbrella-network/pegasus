import {Logger} from 'winston';
import {inject, injectable} from 'inversify';
import {BigNumber, Wallet} from 'ethers';

import ConsensusRunner from './ConsensusRunner';
import BlockRepository from '../repositories/BlockRepository';
import SignatureCollector from './SignatureCollector';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import TimeService from './TimeService';
import Settings, {BlockchainType} from '../types/Settings';
import {MultiChainStatusResolver} from './multiChain/MultiChainStatusResolver';
import {ConsensusDataRepository} from '../repositories/ConsensusDataRepository';
import {MultiChainStatusProcessor} from './multiChain/MultiChainStatusProcessor';
import {MultichainArchitectureDetector} from './MultichainArchitectureDetector';
import {ValidatorRepository} from '../repositories/ValidatorRepository';
import {ChainStatus} from '../types/ChainStatus';
import {MappingRepository} from '../repositories/MappingRepository';
import {MasterChainData} from '../types/Consensus';
import {BalanceMonitorChecker} from './balanceMonitor/BalanceMonitorChecker';
import {sleep} from '../utils/sleep';

const MASTERCHAINSTATUS_STAKED = 'masterChainStatus.staked';
const MASTERCHAINSTATUS_MIN_SIGNATURES = 'masterChainStatus.minSignatures';
const MASTERCHAINSTATUS_TIME_PADDING = 'masterChainStatus.timePadding';

@injectable()
class BlockMinter {
  @inject('Logger') logger!: Logger;
  @inject(ConsensusRunner) consensusRunner!: ConsensusRunner;
  @inject(MultiChainStatusResolver) multiChainStatusResolver!: MultiChainStatusResolver;
  @inject(MultiChainStatusProcessor) multiChainStatusProcessor!: MultiChainStatusProcessor;
  @inject(TimeService) timeService!: TimeService;
  @inject(SignatureCollector) signatureCollector!: SignatureCollector;
  @inject(SortedMerkleTreeFactory) sortedMerkleTreeFactory!: SortedMerkleTreeFactory;
  @inject(BlockRepository) blockRepository!: BlockRepository;
  @inject(ConsensusDataRepository) consensusDataRepository!: ConsensusDataRepository;
  @inject(MultichainArchitectureDetector) multichainArchitectureDetector!: MultichainArchitectureDetector;
  @inject(ValidatorRepository) validatorRepository!: ValidatorRepository;
  @inject(MappingRepository) mappingRepository!: MappingRepository;
  @inject(BalanceMonitorChecker) balanceMonitorChecker!: BalanceMonitorChecker;
  @inject('Settings') settings!: Settings;

  async apply(): Promise<void> {
    const dataTimestamp = this.timeService.apply(this.settings.dataTimestampOffsetSeconds);

    if (!(await this.balanceMonitorChecker.apply(BlockchainType.LAYER2))) {
      this.logger.error(`[BlockMinter] There is not enough balance in any of the chains for ${BlockchainType.LAYER2}`);
      await sleep(60_000); // slow down execution
      return;
    }

    const {chainsStatuses, chainsIdsReadyForBlock, nextLeader, validators} = await this.multiChainStatusResolver.apply(
      dataTimestamp,
    );

    if (chainsStatuses.length === 0) {
      const message = '[BlockMinter] No chain status resolved.';
      this.logger.error(message);
      throw new Error(message);
    }

    if (chainsIdsReadyForBlock.length === 0) {
      this.logger.info(`[BlockMinter] None of ${chainsStatuses.length} chains is ready for data at ${dataTimestamp}`);
      return;
    }

    if (!this.isLeader(nextLeader, dataTimestamp)) {
      return;
    }

    this.logger.info(
      `Starting consensus at: ${dataTimestamp}, got status for ${chainsStatuses
        .map(({chainId}) => chainId)
        .join(', ')}`,
    );

    const masterChainStatus = this.multiChainStatusProcessor.findMasterChain(chainsStatuses);
    const masterChainData = await this.resolveMasterChainData(masterChainStatus);

    const consensus = await this.consensusRunner.apply(
      dataTimestamp,
      validators,
      masterChainData.staked,
      masterChainData.minSignatures,
    );

    if (!consensus) {
      this.logger.warn(`No consensus at ${dataTimestamp}`);
      return;
    }

    await this.consensusDataRepository.save({
      ...consensus,
      chainIds: chainsIdsReadyForBlock,
      timePadding: masterChainData.timePadding,
    });

    this.logger.info(`consensus for ${dataTimestamp} successfully saved`);
  }

  private async resolveMasterChainData(masterChainStatus: ChainStatus | undefined): Promise<MasterChainData> {
    if (masterChainStatus) {
      const {staked, minSignatures, timePadding} = masterChainStatus;

      await this.mappingRepository.setMany([
        {_id: MASTERCHAINSTATUS_STAKED, value: staked.toString()},
        {_id: MASTERCHAINSTATUS_MIN_SIGNATURES, value: minSignatures.toString()},
        {_id: MASTERCHAINSTATUS_TIME_PADDING, value: timePadding.toString()},
      ]);

      return {staked, minSignatures, timePadding};
    }

    const keys = [MASTERCHAINSTATUS_STAKED, MASTERCHAINSTATUS_MIN_SIGNATURES, MASTERCHAINSTATUS_TIME_PADDING];
    const data = await this.mappingRepository.getMany(keys);

    if (Object.keys(data).length !== keys.length) {
      throw new Error(`[masterChainData] master chain data missing and cache empty (${Object.keys(data)})`);
    }

    this.logger.info(`[masterChainData] using cached data`);

    return {
      staked: BigNumber.from(data[MASTERCHAINSTATUS_STAKED]),
      minSignatures: parseInt(data[MASTERCHAINSTATUS_MIN_SIGNATURES], 10),
      timePadding: parseInt(data[MASTERCHAINSTATUS_TIME_PADDING], 10),
    };
  }

  private isLeader(nextLeader: string, dataTimestamp: number): boolean {
    const walletAddress = new Wallet(this.settings.blockchain.wallets.evm.privateKey).address;
    const addressMatch = nextLeader.toLowerCase() === walletAddress.toLowerCase();

    this.logger.info(`Next leader for ${dataTimestamp}: ${nextLeader}, ${addressMatch}`);

    return addressMatch;
  }
}

export default BlockMinter;

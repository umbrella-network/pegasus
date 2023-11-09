import {Logger} from 'winston';
import {inject, injectable} from 'inversify';
import {Wallet} from 'ethers';

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

const MASTERCHAINSTATUS_MIN_SIGNATURES = 'masterChainStatus.minSignatures';

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

    const {chainsStatuses, chainsIdsReadyForBlock, nextLeader, validators} =
      await this.multiChainStatusResolver.apply(dataTimestamp);

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

    const masterChainData = await this.resolveMasterChainData(chainsStatuses[0].chainStatus);

    const consensus = await this.consensusRunner.apply(dataTimestamp, validators, masterChainData.minSignatures);

    if (!consensus) {
      this.logger.warn(`No consensus at ${dataTimestamp}`);
      return;
    }

    await this.consensusDataRepository.save({
      ...consensus,
      chainIds: chainsIdsReadyForBlock,
    });

    this.logger.info(`consensus for ${dataTimestamp} successfully saved`);
  }

  private async resolveMasterChainData(anyChainStatus: ChainStatus): Promise<MasterChainData> {
    if (anyChainStatus) {
      const {minSignatures} = anyChainStatus;

      await this.mappingRepository.setMany([{_id: MASTERCHAINSTATUS_MIN_SIGNATURES, value: minSignatures.toString()}]);

      return {minSignatures};
    }

    const keys = [MASTERCHAINSTATUS_MIN_SIGNATURES];
    const data = await this.mappingRepository.getMany(keys);

    if (Object.keys(data).length !== keys.length) {
      throw new Error(`[masterChainData] master chain data missing and cache empty (${Object.keys(data)})`);
    }

    this.logger.info('[masterChainData] using cached data');

    return {
      minSignatures: parseInt(data[MASTERCHAINSTATUS_MIN_SIGNATURES], 10),
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

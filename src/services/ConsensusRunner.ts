import {Logger} from 'winston';
import sort from 'fast-sort';
import {inject, injectable} from 'inversify';
import {BigNumber, ethers, Wallet} from 'ethers';
import Feeds, {HexStringWith0x} from '../types/Feed';

import loadFeeds from '../services/loadFeeds';
import FeedProcessor from './FeedProcessor';
import BlockRepository from './BlockRepository';
import SignatureCollector from './SignatureCollector';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import TimeService from './TimeService';
import ChainContract from '../contracts/ChainContract';
import Blockchain from '../lib/Blockchain';
import Leaf from '../types/Leaf';
import {BlockSignerResponseWithPower} from '../types/BlockSignerResponse';
import {Consensus, DataForConsensus, LeavesAndFeeds} from '../types/Consensus';
import Settings from '../types/Settings';
import {KeyValues, SignedBlock} from '../types/SignedBlock';
import {Validator} from '../types/Validator';
import {ValidatorsResponses} from '../types/ValidatorsResponses';
import {generateAffidavit, signAffidavitWithWallet, sortLeaves, sortSignaturesBySigner} from '../utils/mining';
import {ConsensusOptimizer, ConsensusOptimizerProps} from './ConsensusOptimizer';

@injectable()
class ConsensusRunner {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ChainContract) chainContract!: ChainContract;
  @inject(TimeService) timeService!: TimeService;
  @inject(SignatureCollector) signatureCollector!: SignatureCollector;
  @inject(FeedProcessor) feedProcessor!: FeedProcessor;
  @inject(BlockRepository) blockRepository!: BlockRepository;
  @inject(ConsensusOptimizer) consensusOptimizer!: ConsensusOptimizer;
  @inject('Settings') settings!: Settings;

  async apply(
    dataTimestamp: number,
    blockHeight: number,
    validators: Validator[],
    staked: BigNumber,
    requiredSignatures: number,
  ): Promise<Consensus | null> {
    let {firstClassLeaves, leaves} = await this.leavesAndFeeds(dataTimestamp);
    let maxLeafKeyCount: number;
    let maxFcdKeyCount: number;
    const maxRetries = this.settings.consensus.retries;

    for (let i = 1; i <= maxRetries; i++) {
      this.logger.info(`[${blockHeight}] Starting Consensus Round ${i}.`);
      const dataForConsensus = await this.getDataForConsensus(dataTimestamp, firstClassLeaves, leaves);
      const consensusRoundResult = await this.runConsensus(dataForConsensus, validators, requiredSignatures);
      const {consensus, discrepantKeys} = consensusRoundResult;
      const leafKeyCount = dataForConsensus.leaves.length;
      const fcdKeyCount = dataForConsensus.fcdKeys.length;
      const discrepantCount = discrepantKeys.size;

      maxLeafKeyCount ||= leafKeyCount;
      maxFcdKeyCount ||= fcdKeyCount;

      const logProps = {
        round: i,
        blockHeight,
        leafKeyCount,
        fcdKeyCount,
        maxLeafKeyCount,
        maxFcdKeyCount,
        discrepantCount,
      };

      if (consensus) {
        this.logConsensusResult({status: 'SUCCESS', ...logProps});
        return consensus;
      }

      if (discrepantKeys.size == 0) {
        this.logConsensusResult({status: 'FAILED', ...logProps});
        return null;
      }

      if (i == maxRetries) {
        this.logConsensusResult({status: 'RETRIES_EXHAUSTED', ...logProps});
        return null;
      }

      this.logConsensusResult({status: 'RETRY', ...logProps});
      this.logger.debug(`Dumping discrepancy data (${discrepantCount}): ${Array.from(discrepantKeys).join(', ')}`);
      ({firstClassLeaves, leaves} = this.removeIgnoredKeys(firstClassLeaves, leaves, discrepantKeys));
    }

    return null;
  }

  private logConsensusResult(props: {
    blockHeight: number;
    status: string;
    leafKeyCount: number;
    fcdKeyCount: number;
    maxLeafKeyCount: number;
    maxFcdKeyCount: number;
    discrepantCount: number;
    round: number;
  }): void {
    const totalKeyCount = props.leafKeyCount + props.fcdKeyCount;
    const maxTotalKeyCount = props.maxLeafKeyCount + props.maxFcdKeyCount;
    const consensusYield = maxTotalKeyCount == 0 ? 0.0 : Math.round((totalKeyCount / maxTotalKeyCount) * 10000) / 10000;

    const msg = [
      `[${props.blockHeight}] Consensus Round ${props.round} Finished.`,
      `Status: ${props.status}`,
      `| Keys: ${totalKeyCount} (${props.leafKeyCount} + ${props.fcdKeyCount} FCDs)`,
      `| Missed: ${props.discrepantCount}`,
      `| Yield: ${consensusYield * 100}%`,
    ].join(' ');

    this.logger.info(msg);
  }

  private async leavesAndFeeds(dataTimestamp: number): Promise<LeavesAndFeeds> {
    const feeds: Feeds[] = await Promise.all(
      [this.settings.feedsOnChain, this.settings.feedsFile].map((fileName) => loadFeeds(fileName)),
    );
    const [firstClassLeaves, leaves] = await this.feedProcessor.apply(dataTimestamp, ...feeds);
    return {firstClassLeaves, leaves, fcdsFeeds: feeds[0], leavesFeeds: feeds[1]};
  }

  private async runConsensus(
    dataForConsensus: DataForConsensus,
    validators: Validator[],
    requiredSignatures: number,
  ): Promise<{consensus: Consensus | null; discrepantKeys: Set<string>}> {
    const {fcdKeys, fcdValues, leaves} = dataForConsensus;

    const signedBlock: SignedBlock = {
      dataTimestamp: dataForConsensus.dataTimestamp,
      leaves: this.leavesToKeyValues(leaves),
      fcd: this.fcdToKeyValues(fcdKeys, fcdValues),
      signature: await signAffidavitWithWallet(this.blockchain.wallet, dataForConsensus.affidavit),
    };

    this.logger.info(
      `Running consensus at ${dataForConsensus.dataTimestamp} with ${validators.length} validators, ${leaves.length} leaves, ${fcdKeys.length} FCDs`,
    );

    const blockSignerResponsesWithPowers = await this.signatureCollector.apply(
      signedBlock,
      dataForConsensus.affidavit,
      validators,
    );

    const {powers, discrepantKeys, signatures} = this.processValidatorsResponses(
      blockSignerResponsesWithPowers,
      requiredSignatures,
    );

    if (!this.hasConsensus(signatures, requiredSignatures)) {
      return {consensus: null, discrepantKeys};
    }

    return {
      consensus: {
        dataTimestamp: signedBlock.dataTimestamp,
        leaves,
        fcdKeys,
        fcdValues,
        power: powers,
        root: dataForConsensus.root,
        signatures: sortSignaturesBySigner(signatures, dataForConsensus.affidavit),
      },
      discrepantKeys: new Set<string>(),
    };
  }

  private leavesToKeyValues(leaves: Leaf[]): KeyValues {
    return Object.fromEntries(leaves.map(({label, valueBytes}) => [label, valueBytes]));
  }

  private fcdToKeyValues(fcdKeys: string[], fcdValues: HexStringWith0x[]): KeyValues {
    return Object.fromEntries(fcdKeys.map((_, idx) => [fcdKeys[idx], fcdValues[idx]]));
  }

  private hasConsensus(signatures: string[], requiredSignatures: number): boolean {
    if (signatures.length < requiredSignatures) {
      this.logger.info(`Not enough signatures: got ${signatures.length}, required: ${requiredSignatures}`);
      return false;
    }

    return true;

    // we turn on power when we will add DPoS
    /*
    const requiredPercent = 66;
    const got = powers.mul(100);
    const required = staked.mul(requiredPercent);

    if (got.gt(required)) {
      return true;
    }

    this.logger.info(`Not enough power: got ${got.toString()}, required: ${required.toString()}`);
    return false;
    */
  }

  private async getDataForConsensus(
    dataTimestamp: number,
    firstClassLeaves: Leaf[],
    leaves: Leaf[],
  ): Promise<DataForConsensus> {
    const tree = SortedMerkleTreeFactory.apply(sortLeaves(leaves));
    const sortedFirstClassLeaves = sortLeaves(firstClassLeaves);
    const fcdKeys = sortedFirstClassLeaves.map(({label}) => label);
    const fcdValues = sortedFirstClassLeaves.map(({valueBytes}) => valueBytes);

    const affidavit = generateAffidavit(dataTimestamp, tree.getRoot(), fcdKeys, fcdValues);

    return {
      dataTimestamp,
      affidavit,
      fcdKeys,
      fcdValues,
      leaves,
      root: tree.getRoot(),
    };
  }

  private removeIgnoredKeys(
    firstClassLeaves: Leaf[],
    leaves: Leaf[],
    ignoredKeys: Set<string>,
  ): {firstClassLeaves: Leaf[]; leaves: Leaf[]} {
    return {
      firstClassLeaves: firstClassLeaves.filter((leaf) => !ignoredKeys.has(leaf.label)),
      leaves: leaves.filter((leaf) => !ignoredKeys.has(leaf.label)),
    };
  }

  private processValidatorsResponses(
    blockSignerResponses: BlockSignerResponseWithPower[],
    requiredSignatures: number,
  ): ValidatorsResponses {
    if (this.settings.consensus.strategy == 'optimized') {
      return this.generateOptimizedConsensus(blockSignerResponses, requiredSignatures);
    } else {
      return this.generateSimpleConsensus(blockSignerResponses);
    }
  }

  private generateSimpleConsensus(blockSignerResponses: BlockSignerResponseWithPower[]): ValidatorsResponses {
    const signatures: string[] = [];
    const discrepantKeys: Set<string> = new Set();
    let powers: BigNumber = BigNumber.from(0);

    blockSignerResponses.forEach((response: BlockSignerResponseWithPower) => {
      this.versionCheck(response.version);

      if (response.error) {
        this.logger.info(`Discarding ${response.validator} - the response contains an error: ${response.error}`);
        this.logger.debug(`${response.validator} Dump: ${JSON.stringify(response)}`);
        return;
      }

      if (response.signature) {
        this.logger.info(`Adding ${response.validator} signature - ${response.signature}`);
        signatures.push(response.signature);
        powers = powers.add(response.power);
        return;
      }

      const discrepancies = response.discrepancies || [];

      if (discrepancies.length > this.settings.consensus.discrepancyCutoff) {
        this.logger.warn(`Validator ${response.validator} ignored because of ${discrepancies.length} discrepancies`);
        return;
      }

      this.logger.info(
        `Discarding ${response.validator} - No valid signature. Discrepancies: ${discrepancies.length}.`,
      );

      discrepancies.forEach((discrepancy) => discrepantKeys.add(discrepancy.key));
      this.logger.debug(`${response.validator} Dump: ${JSON.stringify(response)}`);
    });

    return {signatures, discrepantKeys, powers};
  }

  private generateOptimizedConsensus(
    blockSignerResponses: BlockSignerResponseWithPower[],
    requiredSignatures: number,
  ): ValidatorsResponses {
    const signatures: string[] = [];
    let powers: BigNumber = BigNumber.from(0);

    const consensusOptimizerProps: ConsensusOptimizerProps = {
      participants: [],
      constraints: {
        minimumRequiredPower: 1n,
        minimumRequiredSignatures: Math.max(requiredSignatures - 1, 0),
      },
    };

    for (const response of blockSignerResponses) {
      this.versionCheck(response.version);

      if (response.error) continue;

      if (response.signature) {
        powers = powers.add(response.power);
        signatures.push(response.signature);
        continue;
      }

      if (!response.validator) continue;
      if (!response.discrepancies) continue;

      consensusOptimizerProps.participants.push({
        address: response.validator,
        power: response.power.toBigInt(),
        discrepancies: response.discrepancies.map((d) => d.key),
      });
    }

    const discrepantKeys = this.consensusOptimizer.apply(consensusOptimizerProps) || new Set<string>();
    return {signatures, discrepantKeys, powers};
  }

  private versionCheck(version: string) {
    const expected = this.settings.version.split('.');

    if (!version) {
      this.logger.warn('version check fail: no version');
      return;
    }

    const v = version.split('.');

    if (expected[0] !== v[0]) {
      this.logger.error(`version check fail: expected ${this.settings.version} got ${version}`);
    } else if (expected[1] !== v[1]) {
      this.logger.warn(`version check warn: ${this.settings.version} vs ${version}`);
    } else if (expected[2] !== v[2]) {
      this.logger.info(`version check: ${this.settings.version} vs ${version}`);
    }
  }

  static recoverSigner(affidavit: string, signature: string): string {
    const pubKey = ethers.utils.recoverPublicKey(
      ethers.utils.solidityKeccak256(
        ['string', 'bytes32'],
        ['\x19Ethereum Signed Message:\n32', ethers.utils.arrayify(affidavit)],
      ),
      signature,
    );

    return ethers.utils.computeAddress(pubKey);
  }

  static sortLeaves(feeds: Leaf[]): Leaf[] {
    return sort(feeds).asc(({label}) => label);
  }

  static async signAffidavitWithWallet(wallet: Wallet, affidavit: string): Promise<string> {
    const toSign = ethers.utils.arrayify(affidavit);
    return wallet.signMessage(toSign);
  }
}

export default ConsensusRunner;

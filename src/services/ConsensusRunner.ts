import {Logger} from 'winston';
import sort from 'fast-sort';
import {inject, injectable} from 'inversify';
import {BigNumber, ethers, Wallet} from 'ethers';
import BlockRepository from '../repositories/BlockRepository';
import SignatureCollector from './SignatureCollector';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import TimeService from './TimeService';
import ChainContract from '../contracts/ChainContract';
import Blockchain from '../lib/Blockchain';
import Leaf from '../types/Leaf';
import {BlockSignerResponseWithPower} from '../types/BlockSignerResponse';
import {Consensus, ConsensusStatus, DataForConsensus, LeavesAndFeeds} from '../types/Consensus';
import Settings from '../types/Settings';
import {KeyValues, SignedBlock} from '../types/SignedBlock';
import {Validator} from '../types/Validator';
import {ValidatorsResponses} from '../types/ValidatorsResponses';
import {generateAffidavit, signAffidavitWithWallet, sortLeaves, sortSignaturesBySigner} from '../utils/mining';
import {FeedDataService} from './FeedDataService';
import {FeedsType, HexStringWith0x} from '../types/Feed';
import {SimpleConsensusResolver} from './consensus/SimpleConsensusResolver';
import {OptimizedConsensusResolver} from './consensus/OptimizedConsensusResolver';
import {sleep} from '../utils/sleep';

@injectable()
class ConsensusRunner {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ChainContract) chainContract!: ChainContract;
  @inject(TimeService) timeService!: TimeService;
  @inject(SignatureCollector) signatureCollector!: SignatureCollector;
  @inject(BlockRepository) blockRepository!: BlockRepository;
  @inject(FeedDataService) feedDataService!: FeedDataService;
  @inject(SimpleConsensusResolver) simpleConsensusResolver!: SimpleConsensusResolver;
  @inject(OptimizedConsensusResolver) optimizedConsensusResolver!: OptimizedConsensusResolver;
  @inject('Settings') settings!: Settings;

  async apply(
    dataTimestamp: number,
    validators: Validator[],
    staked: BigNumber,
    requiredSignatures: number,
  ): Promise<Consensus | null> {
    let {firstClassLeaves, leaves} = (await this.feedDataService.apply(
      dataTimestamp,
      FeedsType.CONSENSUS,
    )) as LeavesAndFeeds;

    let maxLeafKeyCount!: number;
    let maxFcdKeyCount!: number;

    const maxRetries = this.settings.consensus.retries;

    for (let i = 1; i <= maxRetries; i++) {
      this.logger.info(`[ConsensusRunner] Starting Consensus Round ${i}.`);
      const dataForConsensus = this.getDataForConsensus(dataTimestamp, firstClassLeaves, leaves);
      const {consensus, discrepantKeys} = await this.runConsensus(dataForConsensus, validators, requiredSignatures);
      const leafKeyCount = dataForConsensus.leaves.length;
      const fcdKeyCount = dataForConsensus.fcdKeys.length;
      const discrepantCount = discrepantKeys.size;
      if (!maxLeafKeyCount) maxLeafKeyCount = leafKeyCount;
      if (!maxFcdKeyCount) maxFcdKeyCount = fcdKeyCount;

      const logProps = {
        round: i,
        maxRounds: maxRetries,
        leafKeyCount,
        fcdKeyCount,
        maxLeafKeyCount,
        maxFcdKeyCount,
        discrepantCount,
      };

      if (consensus.status === ConsensusStatus.SUCCESS) {
        this.logConsensusResult({status: 'SUCCESS', ...logProps});
        return consensus;
      } else if (i < maxRetries && discrepantKeys.size > 0) {
        this.logger.debug(
          `[ConsensusRunner] Dumping discrepancy data (${discrepantCount}): ${Array.from(discrepantKeys).join(', ')}`,
        );
        this.logConsensusResult({status: 'RETRY', ...logProps});
        ({firstClassLeaves, leaves} = this.removeIgnoredKeys(firstClassLeaves, leaves, discrepantKeys));
        await sleep(this.settings.consensus.roundInterval);
      } else {
        this.logConsensusResult({status: 'FAILED', ...logProps});
        return null;
      }
    }

    return null;
  }

  private logConsensusResult(props: {
    maxRounds: number;
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
      `[ConsensusRunner] Consensus Round ${props.round}/${props.maxRounds} Finished.`,
      `Status: ${props.status}`,
      `| Keys: ${totalKeyCount} (${props.leafKeyCount} + ${props.fcdKeyCount} FCDs)`,
      `| Missed: ${props.discrepantCount}`,
      `| Yield: ${consensusYield * 100}%`,
    ].join(' ');

    this.logger.info(msg);
  }

  private async runConsensus(
    dataForConsensus: DataForConsensus,
    validators: Validator[],
    requiredSignatures: number,
  ): Promise<{consensus: Consensus; discrepantKeys: Set<string>}> {
    const {fcdKeys, fcdValues, leaves} = dataForConsensus;

    const signedBlock: SignedBlock = {
      dataTimestamp: dataForConsensus.dataTimestamp,
      leaves: this.leavesToKeyValues(leaves),
      fcd: this.fcdToKeyValues(fcdKeys, fcdValues),
      signature: await signAffidavitWithWallet(this.blockchain.wallet, dataForConsensus.affidavit),
    };

    this.logger.info(
      `[ConsensusRunner] Running consensus at ${dataForConsensus.dataTimestamp} with ${validators.length} validators, ${leaves.length} leaves, ${fcdKeys.length} FCDs`,
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
      this.logger.debug(`[ConsensusRunner] no consensus, discrepantKeys.size: ${discrepantKeys.size}`);

      return {
        consensus: {
          dataTimestamp: signedBlock.dataTimestamp,
          leaves,
          fcdKeys,
          fcdValues,
          power: powers,
          root: dataForConsensus.root,
          signatures: sortSignaturesBySigner(signatures, dataForConsensus.affidavit),
          status: ConsensusStatus.FAILED,
        },
        discrepantKeys,
      };
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
        status: ConsensusStatus.SUCCESS,
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
      this.logger.info(
        `[ConsensusRunner] Not enough signatures: got ${signatures.length}, required: ${requiredSignatures}`,
      );
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

  private getDataForConsensus(dataTimestamp: number, firstClassLeaves: Leaf[], leaves: Leaf[]): DataForConsensus {
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
      return this.optimizedConsensusResolver.apply(blockSignerResponses, requiredSignatures);
    } else {
      return this.simpleConsensusResolver.apply(blockSignerResponses);
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

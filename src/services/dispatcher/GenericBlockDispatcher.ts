import {injectable, postConstruct} from 'inversify';
import {BlockDispatcher} from './BlockDispatcher';
import {ChainStatus} from '../../types/ChainStatus';
import {IGenericBlockchain} from '../../lib/blockchains/IGenericBlockchain';
import {IGenericChainContract} from '../../contracts/generic/IGenericChainContract';
import Block from '../../models/Block';
import {FeedValue} from '@umb-network/toolbox/dist/types/Feed';

@injectable()
export abstract class GenericBlockDispatcher extends BlockDispatcher {
  protected genericBlockchain!: IGenericBlockchain;
  protected genericChainContract!: IGenericChainContract;

  @postConstruct()
  protected async setup(): Promise<void> {
    this.genericBlockchain = this.blockchainRepository.getGeneric(this.chainId);
    this.genericChainContract = this.chainContractRepository.getGeneric(this.chainId);
    await this.postSetup();
  }

  abstract postSetup(): Promise<void>;

  abstract replicateGeneric(
    block: Block,
    keys: string[],
    values: FeedValue[],
    status: ChainStatus,
  ): // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Promise<any>;

  // replicate = async (consensus: Consensus[], status: ChainStatus): Promise<ReplicationStatus> => {
  //   const fetchedFCDs = await this.fcdRepository.findFCDsForReplication(block);
  //   if (!fetchedFCDs.keys.length) {
  //     this.logger.warn(`[${this.chainId}] No FCDs found for replication`);
  //   }

  //   return this.replicateGeneric(block, fetchedFCDs.keys, fetchedFCDs.values, status);
  // };
}

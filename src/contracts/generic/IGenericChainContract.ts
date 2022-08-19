import Settings from '../../types/Settings';
import {IGenericBlockchain} from '../../lib/blockchains/IGenericBlockchain';
import {SolanaChainStatus} from '../../types/ChainStatus';
import {FeedValue} from '@umb-network/toolbox/dist/types/Feed';

export type TransactionResult = {
  transactionHash: string | null;
  status: boolean;
  blockNumber: number | null;
};

export type GenericForeignChainContractProps = {
  blockchain: IGenericBlockchain;
  settings: Settings;
};

export interface IGenericChainContract {
  readonly settings: Settings;
  readonly blockchain: IGenericBlockchain;
  address: string;

  submit(
    dataTimestamp: number,
    root: string,
    keys: string[],
    values: FeedValue[],
    blockId: number,
  ): Promise<TransactionResult>;

  resolveContract(): void;
  resolveStatus(): Promise<[address: string, status: SolanaChainStatus]>;
  blocksCountOffset(): Promise<number>;
  resolveBlocksCountOffset(chainAddress: string): Promise<number>;
}

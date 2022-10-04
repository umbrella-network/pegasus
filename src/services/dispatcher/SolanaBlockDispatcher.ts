import {injectable} from 'inversify';
import {GenericBlockDispatcher} from './GenericBlockDispatcher';
import {ChainsIds} from '../../types/ChainsIds';
import {TransactionResult} from '../../contracts/generic/IGenericChainContract';
import TimeService from '../TimeService';
import {FeedValue} from '@umb-network/toolbox/dist/types/Feed';
import {SolanaChainContract} from '../../contracts/generic/SolanaChainContract';
import Block from 'src/models/Block';

export const initializedFCDKeys = [
  'AAVE-USD',
  'BNB-USD',
  'BNT-USD',
  'BTC-USD',
  'COMP-USD',
  'DAI-USD',
  'ETH-USD',
  'FTS-USD',
  'GVol-BTC-IV-28days',
  'GVol-ETH-IV-28days',
  'LINK-USD',
  'MAHA-USD',
  'REN-USD',
  'SNX-USD',
  'UMB-USD',
  'UNI-USD',
  'YFI-USD',
];

@injectable()
export class SolanaBlockDispatcher extends GenericBlockDispatcher {
  readonly chainId = 'solana' as ChainsIds;

  async postSetup(): Promise<void> {
    // nothing required for solana
    return;
  }

  async replicateGeneric(
    block: Block,
    keys: string[],
    values: FeedValue[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    this.logger.info(`[solana] Received a total of ${keys.length} FCDs to replicate`);

    this.logger.info(`[solana] FCD's received: ${keys.join(', ')}`);

    if (keys.length !== values.length) {
      this.logger.info('[solana] Number of FCD keys does not match number of FCD values');

      return;
    }

    const timestamp = TimeService.msToSec(block.dataTimestamp.getTime());

    const [useKeys, useValues] = await this.getFCDsToSubmit(keys, values, timestamp);

    const transactionResult: TransactionResult = await this.genericChainContract.submit(
      timestamp,
      block.root,
      useKeys,
      useValues,
      block.blockId,
    );

    if (!transactionResult) {
      return {errors: [`[${this.chainId}] Unable to send tx for blockId ${block.blockId} - no signature received`]};
    }

    if (transactionResult.status) {
      this.logger.info(
        `[${this.chainId}] block ${block.blockId} replicated with success at tx: ${transactionResult.transactionHash}`,
      );
    } else {
      return {errors: [`[${this.chainId}] Unable to send tx for blockId ${block.blockId}`]};
    }

    if (transactionResult.status) {
      return {
        blocks: [block],
        fcds: [
          {
            keys: useKeys,
            values: useValues,
          },
        ],
        anchors: [transactionResult.blockNumber],
      };
    }
  }

  async getFCDsToSubmit(keys: string[], values: FeedValue[], dataTimestamp: number): Promise<[string[], FeedValue[]]> {
    this.logger.info('[solana] Checking keys for initialization');

    const useKeys = [];
    const useValues = [];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      if (initializedFCDKeys.includes(key)) {
        useKeys.push(key);
        useValues.push(values[i]);
      } else {
        if (await this.isFCDInitialized(key)) {
          initializedFCDKeys.push(key);
          useKeys.push(key);
          useValues.push(values[i]);
        } else {
          this.logger.info(`[solana] Key not yet initialized: ${key}`);

          (<SolanaChainContract>this.genericChainContract)
            .initializeFCD(key, values[i], dataTimestamp)
            .then((success) => {
              if (success) {
                this.logger.info(`[solana] Key initialized: ${key}`);
              } else {
                this.logger.info(`[solana] Failed to initialize key: ${key}`);
              }
            });
        }
      }
    }

    this.logger.info(`[solana] Using FCDs: ${useKeys.join(', ')}`);

    return [useKeys, useValues];
  }

  async isFCDInitialized(key: string): Promise<boolean> {
    return (<SolanaChainContract>this.genericChainContract).isFCDInitialized(key);
  }
}

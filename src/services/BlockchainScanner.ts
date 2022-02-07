import {inject, injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import {BlockchainMarker} from '../models/BlockchainMarker';
import {Logger} from 'winston';
import {Provider} from '@ethersproject/providers';

export type Result = {
  fromBlock: number;
  toBlock?: number;
  success: boolean;
  synchronized?: boolean;
};

@injectable()
export abstract class BlockchainScanner {
  @inject('Logger') logger!: Logger;

  startBlock!: number;
  blockchainId!: string;
  markerId!: string;
  step!: number;
  provider!: Provider;

  abstract apply(fromBlock: number, toBlock: number): Promise<boolean>;

  async run(): Promise<Result> {
    const fromBlock = await this.getMarker();
    const toBlock = await this.getToBlock(fromBlock);
    let success = false;

    try {
      success = await this.apply(fromBlock, toBlock);
    } catch (e) {
      this.logger.error(e);
    }

    if (success) await this.updateMarker(toBlock);
    return {fromBlock, toBlock, success, synchronized: toBlock < fromBlock + this.step};
  }

  private async getToBlock(fromBlock: number): Promise<number> {
    const latestBlock = await this.provider.getBlockNumber();
    const stepBlock = fromBlock + this.step;
    return latestBlock > stepBlock ? stepBlock : latestBlock;
  }

  private async getMarker(): Promise<number> {
    const marker = await getModelForClass(BlockchainMarker)
      .findOne({blockchainId: this.blockchainId, referenceId: this.markerId})
      .exec();

    return marker ? marker.blockHeight : this.startBlock;
  }

  private async updateMarker(blockHeight: number): Promise<void> {
    await getModelForClass(BlockchainMarker)
      .updateOne({blockchainId: this.blockchainId, referenceId: this.markerId}, {blockHeight}, {upsert: true})
      .exec();
  }
}

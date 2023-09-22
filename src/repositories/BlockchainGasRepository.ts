import {Logger} from 'winston';
import {inject, injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import {ChainsIds} from '../types/ChainsIds';
import GasPrice from '../models/GasPrice';
import {BlockchainGas} from '../types/BlockchainGas';

@injectable()
export class BlockchainGasRepository {
  @inject('Logger') logger!: Logger;

  async twap(chainId: ChainsIds, minutes: number, atTimestamp: number): Promise<number | undefined> {
    const minutesAgo = 60 * minutes;
    const oldTimestamp = atTimestamp - minutesAgo;

    const datas = await getModelForClass(GasPrice)
      .find({chainId, blockTimestamp: {$gte: oldTimestamp, $lte: atTimestamp}})
      .exec();

    if (datas.length == 0) {
      const last = await this.last(chainId);
      this.logger.warn(`[${chainId}] no data for TWAP${minutes}, last observation at bn: ${last?.blockNumber}`);
      return;
    }

    const sum = datas.reduce((sum, gas) => sum + BigInt(gas.gas), 0n);
    this.logger.debug(`TWAP${minutes}: ${oldTimestamp} - ${atTimestamp}sec = ${sum / BigInt(datas.length)}`);
    return Number(sum / BigInt(datas.length));
  }

  async last(chainId: ChainsIds): Promise<BlockchainGas | undefined> {
    const s = await getModelForClass(GasPrice)
      .findOne({chainId}, null, {sort: {blockTimestamp: -1}})
      .exec();

    if (s) {
      return {
        gas: BigInt(s.gas),
        chainId,
        blockTimestamp: s.blockTimestamp,
        blockNumber: s.blockNumber,
      };
    }
  }

  async purge(): Promise<void> {
    const oneDay = 60 * 60 * 24;
    const oldTimestamp = Math.trunc(Date.now() / 1000 - oneDay);
    await getModelForClass(GasPrice).deleteMany({blockTimestamp: {$lt: oldTimestamp}});
  }

  async save(gas: BlockchainGas): Promise<void> {
    const id = `${gas.chainId}@${gas.blockNumber}`;
    const doc = await getModelForClass(GasPrice).create({...gas, _id: id});
    await doc.save();
  }
}

import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import {ChainsIds} from '../../types/ChainsIds.js';
import {PriceModel_Gas} from '../../models/fetchers/PriceModel_Gas.js';
import {BlockchainGas} from '../../types/BlockchainGas.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {FetchedValueType, FetcherName} from '../../types/fetchers.js';

@injectable()
export class TWAPGasRepository extends CommonPriceDataRepository {
  constructor() {
    super();
    this.model = getModelForClass(PriceModel_Gas);
    this.logPrefix = '[TWAPGasRepository]';
  }

  async twap(chainId: ChainsIds, minutes: number, atTimestamp: number): Promise<number | undefined> {
    const minutesAgo = 60 * minutes;
    const oldTimestamp = atTimestamp - minutesAgo;

    const datas = await this.model
      .find({chainId, timestamp: {$gte: oldTimestamp, $lte: atTimestamp}}, {value: 1})
      .exec();

    if (datas.length == 0) {
      const last = await this.last(chainId);
      this.logger.warn(`${this.logPrefix} ${chainId} no data for TWAP${minutes}, last at bn: ${last?.blockNumber}`);
      return;
    }

    const sum = datas.reduce((sum: bigint, gas: PriceModel_Gas) => sum + BigInt(gas.value), 0n);
    const twapValue = Number(sum / BigInt(datas.length));

    this.logger.debug(`${this.logPrefix} TWAP${minutes}: ${oldTimestamp} - ${atTimestamp}sec = ${twapValue}`);

    return twapValue;
  }

  async last(chainId: ChainsIds): Promise<BlockchainGas | undefined> {
    const s = await this.model.findOne({chainId}, null, {sort: {timestamp: -1}}).exec();

    if (s) {
      return {
        gas: BigInt(s.value),
        chainId,
        blockTimestamp: s.timestamp,
        blockNumber: s.blockNumber,
      };
    }
  }

  async purge(): Promise<void> {
    const oneDay = 60 * 60 * 24;
    const oldTimestamp = Math.trunc(Date.now() / 1000 - oneDay);
    await this.model.deleteMany({timestamp: {$lt: oldTimestamp}});
  }

  async save(gas: BlockchainGas): Promise<void> {
    const messageToSign = this.createMessageToSign(
      gas.gas,
      gas.blockTimestamp,
      this.hashVersion,
      FetcherName.TWAPGasPrice,
      gas.blockNumber.toString(10),
    );

    const {hash, signature, signerAddress, hashVersion} = await this.priceSignerService.sign(messageToSign);

    const doc = await this.model.create({
      hashVersion,
      signature,
      priceHash: hash,
      signer: signerAddress,
      chainId: gas.chainId,
      value: gas.gas.toString(10),
      timestamp: gas.blockTimestamp,
      blockNumber: gas.blockNumber,
      valueType: FetchedValueType.Price,
    });

    await doc.save();
  }
}

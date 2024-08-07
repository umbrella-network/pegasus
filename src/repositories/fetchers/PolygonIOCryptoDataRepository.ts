import {injectable} from 'inversify';
import {Price} from '../../models/Price.js';
import {getModelForClass} from '@typegoose/typegoose';
import dayjs from 'dayjs';
import NodeCache from 'node-cache';

import {CommonPriceDataRepository} from "./common/CommonPriceDataRepository.js";
import {PolygonIOCryptoPriceModel} from "../../models/fetchers/PolygonIOCryptoPriceModel.js";
import {FetchedValueType, FetcherName} from "../../types/fetchers.js";
import {PolygonIOCryptoPriceInputParams} from "../../services/fetchers/PolygonIOCryptoPriceFetcher.js";

export type SavePriceProps = {
  source: string;
  symbol: string;
  value: number;
  timestamp: Date;
  expireAt?: Date;
};

export type LatestPriceProps = {
  source: string;
  symbol: string;
  timestamp: {
    from?: Date;
    to?: Date;
  };
};

export type PolygonIOCryptoDataRepositoryInput = {
  params: PolygonIOCryptoPriceInputParams;
  value: number;
  timestamp: number;
};

// TODO: This should replace and deprecate the current PriceRepository
@injectable()
export class PolygonIOCryptoDataRepository extends CommonPriceDataRepository {
  private logPrefix = '[PolygonIOCryptoDataRepository]';

  defaultPriceTTL = 60 * 60; // TODO: this could be configurable
  cache: NodeCache;

  constructor() {
    super();
    this.cache = new NodeCache({stdTTL: 60, checkperiod: 60});
  }

  async save(dataArr: PolygonIOCryptoDataRepositoryInput[]): Promise<void> {
    const payloads: PolygonIOCryptoPriceModel[] = [];

    const signatures = await Promise.all(
      dataArr.map(({value, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          this.hashVersion,
          FetcherName.PolygonIOCryptoPrice,
          `${params.fsym}-${params.tsym}`
        );

        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, params, timestamp}, ix) => {
      const {signerAddress, signature, hash, hashVersion} = signatures[ix];

      payloads.push({
        symbol: `${params.fsym}-${params.tsym}`,
        value: value.toString(),
        valueType: FetchedValueType.Price,
        timestamp,
        hashVersion,
        signature,
        priceHash: hash,
        signer: signerAddress,
      });
    });

    await this.savePrices(payloads);
  }

  async getLatestPrice(props: LatestPriceProps): Promise<number | undefined> {
    return (await this.getLatestPriceRecord(props))?.value;
  }

  async getLatestPriceRecord(props: LatestPriceProps): Promise<Price | undefined> {
    const {
      source,
      symbol,
      timestamp: {from, to},
    } = props;

    const timestampFilter: {[key: string]: Date} = {};
    if (from) timestampFilter['$gte'] = from;
    if (to) timestampFilter['$lt'] = to;

    const price = await getModelForClass(Price)
      .findOne(
        {
          source,
          symbol,
          timestamp: timestampFilter,
        },
        {},
        {sort: {timestamp: -1}},
      )
      .exec();

    return price || undefined;
  }

  private async savePrices(data: PolygonIOCryptoPriceModel[]): Promise<void> {
    const model = getModelForClass(PolygonIOCryptoPriceModel);

    try {
      await model.bulkWrite(
        data.map((doc) => {
          return {insertOne: {document: doc}};
        }),
      );
    } catch (error) {
      this.logger.error(`${this.logPrefix} couldn't perform bulkWrite: ${error}`);
    }
  }
}

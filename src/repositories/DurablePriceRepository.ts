// import {inject, injectable} from 'inversify';
// import {getModelForClass, index, prop} from '@typegoose/typegoose';
// import {PairWithFreshness} from '../types/Feed';
// import {Logger} from 'winston';
//
// @index({ prefix: 1, symbol: 1, timestamp: 1 }, { unique: true })
// @index({ expireAt: 1 }, { expireAfterSeconds: 0 })
// class Price {
//   @prop()
//   prefix?: string;
//
//   @prop({ required: true })
//   symbol!: string;
//
//   @prop({ required: true })
//   value!: number;
//
//   @prop({ required: true })
//   timestamp!: number;
//
//   @prop({ required: true })
//   expireAt!: Date;
// }
//
// export type SavePriceProps = {
//   price: Price;
// }
//
// export type GetLatestPriceProps = {
//   prefix: string;
//   pair: PairWithFreshness;
//   timestamp: number;
// }
//
// @injectable()
// export class DurablePriceRepository {
//   @inject('Logger')
//   private logger!: Logger;
//
//   async save(props: SavePriceProps): Promise<Price | undefined> {
//     const { price } = props;
//
//     try {
//       return getModelForClass(Price)
//         .findOneAndUpdate(
//           { prefix: price.prefix, symbol: price.symbol, timestamp: price.timestamp },
//           price,
//           { new: true, upsert: true }
//         );
//     } catch (e) {
//       this.logger.error(e);
//       return;
//     }
//   }
//
//   async getLatestPrice(props: GetLatestPriceProps): Promise<Price | undefined> {
//     const { prefix, timestamp, pair: { fsym, tsym, freshness } } = props;
//     const virtualSymbol = `${fsym}~${tsym}`;
//
//     const price = await getModelForClass(Price)
//       .findOne({
//         prefix,
//         symbol: virtualSymbol,
//         timestamp: {
//           $lt: timestamp,
//           $gt: timestamp - freshness
//         }
//       })
//       .sort({ timestamp: 1 })
//       .limit(1)
//       .exec();
//
//     return price ? price: undefined;
//   }
// }

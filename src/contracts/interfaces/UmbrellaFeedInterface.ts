import {PayableOverrides} from '@ethersproject/contracts';
import {PriceData, PriceDataWithKey, UmbrellaFeedsUpdateArgs} from "../../types/DeviationFeeds";
import {ExecutedTx} from "../../types/Consensus";

export interface UmbrellaFeedInterface {
  address(): Promise<string>;
  update(args: UmbrellaFeedsUpdateArgs, payableOverrides: PayableOverrides): Promise<ExecutedTx>;
  getManyPriceDataRaw(keys: string[]): Promise<PriceDataWithKey[] | undefined>;
  requiredSignatures(): Promise<number>;
  resolveAddress(): Promise<string>;
  estimateGasForUpdate(args: UmbrellaFeedsUpdateArgs): Promise<bigint>;
  hashData(bytes32Keys: string[], priceDatas: PriceData[]): Promise<string>;
}

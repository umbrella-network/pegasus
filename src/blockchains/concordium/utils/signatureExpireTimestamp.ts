import {PriceData} from '../../../types/DeviationFeeds';

export function signatureExpireTimestamp(priceData: PriceData | undefined): number {
  if (!priceData) return 0;

  return priceData.timestamp + 10 * 60; // + 10 minutes
}

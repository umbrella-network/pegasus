import {FetcherName} from '../../../types/fetchers.js';

export enum FetchersMappingCacheKeys {
  COINGECKO_PRICE_IDS = `${FetcherName.CoingeckoPrice}_ids`,
  COINGECKO_PRICE_CURRENCIES = `${FetcherName.CoingeckoPrice}_vs_currencies`,
  GOLD_API_PRICE_PARAMS = `${FetcherName.GoldApiPrice}_params`,
  METAL_PRICE_API_PARAMS = `${FetcherName.MetalPriceApi}_params`,
  METALS_DEV_API_PARAMS = `${FetcherName.MetalsDevApi}_params`,
  POLYGONIO_CURRENCY_SNAPSHOT_GRAMS_PARAMS = `${FetcherName.PolygonIOCurrencySnapshotGrams}_params`,
  POLYGONIO_SINGLE_CRYPO_PARAMS = `${FetcherName.PolygonIOSingleCryptoPrice}_params`,
}

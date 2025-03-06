import {FetcherName} from '../../../types/fetchers.js';

export enum FetchersMappingCacheKeys {
  MOC_MEASUREMENT_PARAMS = `${FetcherName.MoCMeasurement}_params`,
  POLYGONIO_CURRENCY_SNAPSHOT_GRAMS_PARAMS = `${FetcherName.PolygonIOCurrencySnapshotGrams}_params`,
  POLYGONIO_SINGLE_CRYPO_PARAMS = `${FetcherName.PolygonIOSingleCryptoPrice}_params`,
  SOVRYN_PRICE_PARAMS = `${FetcherName.SovrynPrice}_params`,
  UNISWAPV3_PARAMS = `${FetcherName.UniswapV3}_params`,
}

import {FetcherName} from '../../../types/fetchers.js';

export enum FetchersMappingCacheKeys {
  SOVRYN_PRICE_PARAMS = `${FetcherName.SovrynPrice}_params`,
  UNISWAPV3_PARAMS = `${FetcherName.UniswapV3}_params`,
}

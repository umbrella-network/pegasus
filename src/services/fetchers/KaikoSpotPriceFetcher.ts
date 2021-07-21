import axios from 'axios';
import {inject, injectable} from 'inversify';
import {price} from '@umb-network/validator';
import Settings from '../../types/Settings';

interface IParams {
  fsym: string;
  tsym: string;
}

@injectable()
class KaikoSpotPriceFetcher {
  private apiKey: string;
  private timeout: number;

  /**
   * Interval is any arbitrary value between one second and one day can be used as an interval, 
   * as long as it sums up to 1 day. The suffixes are s (second), m (minute), h (hour) and d (day).
   * It's the time to consider to aggregate prices that the asset has been traded across exchanges.
   */
  private readonly interval = '30s';

  constructor(@inject('Settings') settings: Settings) {
    this.apiKey = settings.api.kaiko.apiKey;
    this.timeout = settings.api.kaiko.timeout;
  }

  async apply(params: IParams): Promise<number> {
    const sourceUrl = `https://us.market-api.kaiko.io/v2/data/trades.v1/spot_direct_exchange_rate/${params.fsym.toLowerCase()}/${params.tsym.toLowerCase()}?interval=${this.interval}&sources=true`;

    const response = await axios.get(sourceUrl, {
      timeout: this.timeout,
      timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
      headers: {'X-Api-Key': `${this.apiKey}`},
    });

    if (response.status !== 200) {
      throw new Error(response.data);
    }

    return this.extractValue(response.data);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractValue = (responseData: any): number => {
    const sourcesPrices: Array<{
      exchange_code: string;
      count: number;
      price: string;
      volume: string;
    }> = responseData.data[0].sources;

    if (sourcesPrices.length == 0) {
      throw new Error('No recent prices fetched.')
    }

    const priceVolumeArr = sourcesPrices.map(sourcePrice => {
      let priceVolPair: [number, number] = [parseFloat(sourcePrice.price), parseFloat(sourcePrice.volume)];
      return priceVolPair;
    });

    return price.volumeWeightedAveragePrice(priceVolumeArr)
  };
}

export default KaikoSpotPriceFetcher;

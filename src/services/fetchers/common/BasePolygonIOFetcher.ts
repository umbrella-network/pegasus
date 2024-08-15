import {inject, injectable} from 'inversify';
import {JSONPath} from 'jsonpath-plus';
import axios from 'axios';
import {Logger} from 'winston';
import {SinglePriceResponse} from './BasePolygonIOSingleFetcher';
import {SnapshotResponse} from './BasePolygonIOSnapshotFetcher';

@injectable()
export abstract class BasePolygonIOFetcher {
  @inject('Logger') protected logger!: Logger;

  protected apiKey!: string;
  protected timeout!: number;
  protected valuePath!: string;

  protected async fetchRaw(sourceUrl: string): Promise<SnapshotResponse | SinglePriceResponse> {
    const response = await axios.get(sourceUrl, {
      timeout: this.timeout,
      timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
    });

    if (response.status !== 200) {
      throw new Error(response.data);
    }

    return response.data;
  }

  protected extractValues = (data: SinglePriceResponse | SnapshotResponse, valuePath: string): number[] => {
    const extracted = JSONPath({json: data, path: valuePath});

    if (extracted.length == 0) {
      throw new Error(`[extractValues] ${JSON.stringify(data)} does not have path ${valuePath}`);
    }

    return extracted;
  };
}

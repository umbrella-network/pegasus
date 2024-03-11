import {injectable} from 'inversify';
import {JSONPath} from 'jsonpath-plus';
import axios from 'axios';

@injectable()
export abstract class BasePolygonIOFetcher {
  protected apiKey!: string;
  protected timeout!: number;
  protected valuePath!: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async fetchRaw(sourceUrl: string): Promise<any> {
    const response = await axios.get(sourceUrl, {
      timeout: this.timeout,
      timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
    });

    if (response.status !== 200) {
      throw new Error(response.data);
    }

    return response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected extractValues = (data: any, valuePath: string): number | number[] => {
    return JSONPath({json: data, path: valuePath});
  };
}

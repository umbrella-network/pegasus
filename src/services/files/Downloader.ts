import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

@injectable()
export class Downloader {
  @inject('Logger') logger!: Logger;

  private readonly SUCCESS_CODES = [200, 201, 301];
  private readonly logPrefix = '[Downloader]';

  async apply<T>(url: string): Promise<T | undefined> {
    if (!url) return;

    try {
      const response = await axios.get(url);

      if (!this.SUCCESS_CODES.includes(response.status)) {
        this.logger.error(`${this.logPrefix} Download Failed for ${url}. HTTP Status: ${response.status}`);
        this.logger.error(`${this.logPrefix} HTTP Response: ${JSON.stringify(response)}`);
        return;
      }

      return response.data;
    } catch (e) {
      this.logger.error(`${this.logPrefix} Download Failed`);
      this.logger.error(e);
      return;
    }
  }
}

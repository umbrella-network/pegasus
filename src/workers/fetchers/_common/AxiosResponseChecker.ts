import axios, {AxiosResponse} from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {ServiceInterface} from '../../types/fetchers.js';

@injectable()
export class AxiosResponseChecker implements ServiceInterface {
  @inject('Logger') private logger!: Logger;
  private logPrefix = '[AxiosResponseChecker]';

  apply(axiosResponse: AxiosResponse, logPrefix = ''): bool {
    if (axiosResponse.status !== 200) {
      this.logger.error(`${logPrefix}${this.logPrefix} status ${axiosResponse.status}`);
      return false;
    }

    if (axiosResponse.data.Response === 'Error') {
      this.logger.error(
        `${logPrefix}${this.logPrefix} error: ${axiosResponse.data.Message || axiosResponse.data.error}`,
      );
      return false;
    }

    return true;
  }
}

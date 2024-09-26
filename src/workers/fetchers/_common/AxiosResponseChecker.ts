import {AxiosResponse} from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

@injectable()
export class AxiosResponseChecker {
  @inject('Logger') private logger!: Logger;
  private logPrefix = '[AxiosResponseChecker]';

  apply(axiosResponse: AxiosResponse, logPrefix = ''): boolean {
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

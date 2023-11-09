import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {ChainStatus} from '../types/ChainStatus.js';
import {chainReadyForNewBlock} from '../utils/mining.js';

@injectable()
export class CanMint {
  @inject('Logger') logger!: Logger;

  apply = ({
    dataTimestamp,
    chainStatus,
    chainId,
  }: {
    dataTimestamp: number;
    chainStatus: ChainStatus;
    chainId: string;
  }): boolean => {
    const [, error] = chainReadyForNewBlock(chainStatus, dataTimestamp);

    if (error) {
      this.logger.info(`[${chainId}] Can not mint: ${error}`);
      return false;
    }

    return true;
  };
}

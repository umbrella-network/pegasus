import {Logger} from 'ethers/lib/utils';
import {inject, injectable} from 'inversify';

import {ChainStatus} from '../types/ChainStatus';
import {chainReadyForNewBlock} from '../utils/mining';

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
      this.logger.info(`[canMint] Error while checking if chainId ${chainId} is available to mint ${error}`);
      return false;
    }

    return true;
  };
}

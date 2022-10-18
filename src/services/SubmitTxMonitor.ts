import {injectable} from 'inversify';
import fs from 'fs';

import {ChainsIds} from '../types/ChainsIds';

type SubmitMonitor = {
  dataTimestamp: number;
  txHash: string;
};

@injectable()
export class SubmitTxMonitor {
  private filePattern = '/tmp/submit-$chainId.json';

  monitorFile = (chainId: ChainsIds): string => {
    return this.filePattern.replace('$chainId', chainId);
  };

  saveTx = (chainId: ChainsIds, dataTimestamp: number, txHash: string): void => {
    const submitMonitor: SubmitMonitor = {dataTimestamp, txHash};
    const file = this.monitorFile(chainId);
    fs.writeFileSync(file, JSON.stringify(submitMonitor), 'utf-8');
  };

  wasDataSubmitted = (chainId: ChainsIds, dataTimestamp: number): boolean => {
    const file = this.monitorFile(chainId);

    if (!fs.existsSync(file)) {
      return false;
    }

    const submitMonitor: SubmitMonitor = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return dataTimestamp === submitMonitor.dataTimestamp;
  };
}

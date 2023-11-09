import {inject, injectable} from 'inversify';

import LeaderSelector from '../multiChain/LeaderSelector.js';
import Settings from '../../types/Settings.js';
import {Wallet} from 'ethers';

@injectable()
export class DeviationLeaderSelector {
  @inject('Settings') settings!: Settings;

  apply(dataTimestamp: number, validators: string[]): boolean {
    const roundLength = this.settings.deviationTrigger.roundLengthSeconds;
    const leader = LeaderSelector.apply(dataTimestamp, validators, roundLength);
    return leader.toLowerCase() == new Wallet(this.settings.blockchain.wallets.evm.privateKey).address.toLowerCase();
  }
}

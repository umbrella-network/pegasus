import {inject, injectable} from 'inversify';
import {Wallet} from 'ethers';

import Settings from '../../types/Settings.js';
import {LeaderSelector} from '../multiChain/LeaderSelector.js';
import {LeaderSelectorV2} from '../multiChain/LeaderSelectorV2.js';

@injectable()
export class DeviationLeaderSelector {
  @inject('Settings') settings!: Settings;
  @inject(LeaderSelector) leaderSelector!: LeaderSelector;
  @inject(LeaderSelectorV2) leaderSelectorV2!: LeaderSelectorV2;

  apply(dataTimestamp: number, validators: string[]): boolean {
    const roundLength = this.settings.deviationTrigger.roundLengthSeconds;
    const leader = this.leaderSelector.apply(dataTimestamp, validators, roundLength);
    return leader.toLowerCase() == new Wallet(this.settings.blockchain.wallets.evm.privateKey).address.toLowerCase();
  }
}

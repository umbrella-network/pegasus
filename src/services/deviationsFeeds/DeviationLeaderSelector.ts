import {inject, injectable} from 'inversify';

import {LeaderSelector} from '../multiChain/LeaderSelector.js';
import Settings from '../../types/Settings.js';
import {Wallet} from 'ethers';
import {Validator} from '../../types/Validator.js';

@injectable()
export class DeviationLeaderSelector {
  @inject('Settings') settings!: Settings;

  apply(dataTimestamp: number, validators: Validator[]): boolean {
    const roundLength = this.settings.deviationTrigger.roundLengthSeconds;
    const leader = LeaderSelector.apply(dataTimestamp, validators, roundLength);
    return leader.id.toLowerCase() == new Wallet(this.settings.blockchain.wallets.evm.privateKey).address.toLowerCase();
  }
}

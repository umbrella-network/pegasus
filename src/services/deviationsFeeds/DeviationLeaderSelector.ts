import {inject, injectable} from 'inversify';

import {LeaderSelectorV2} from '../multiChain/LeaderSelectorV2.js';
import Settings from '../../types/Settings.js';
import {Wallet} from 'ethers';
import {Validator} from '../../types/Validator.js';

@injectable()
export class DeviationLeaderSelector {
  @inject('Settings') settings!: Settings;

  apply(dataTimestamp: number, validators: Validator[]): boolean {
    const roundLength = this.settings.deviationTrigger.roundLengthSeconds;
    const leader = LeaderSelectorV2.apply(dataTimestamp, validators, roundLength);
    return leader.id.toLowerCase() == new Wallet(this.settings.blockchain.wallets.evm.privateKey).address.toLowerCase();
  }
}

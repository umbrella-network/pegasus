import {inject, injectable} from 'inversify';

import LeaderSelector from "../multiChain/LeaderSelector";
import Blockchain from "../../lib/Blockchain";
import Settings from "../../types/Settings";

@injectable()
export class DeviationLeaderSelector {
  @inject('Settings') settings!: Settings;
  @inject(Blockchain) blockchain!: Blockchain;

  apply(dataTimestamp: number, validators: string[]): boolean {
    const roundLength = this.settings.deviationTrigger.roundLengthSeconds;
    const leader = LeaderSelector.apply(dataTimestamp, validators, roundLength);
    return leader.toLowerCase() == this.blockchain.wallet.address.toLowerCase();
  }
}

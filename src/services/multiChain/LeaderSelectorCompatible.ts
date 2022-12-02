import {ChainStatus} from '../../types/ChainStatus';
import {inject, injectable} from "inversify";
import Blockchain from "../../lib/Blockchain";
import {MultichainArchitectureDetector} from "../MultichainArchitectureDetector";
import {Logger} from "winston";
import LeaderSelector from "./LeaderSelector";
import Settings from "../../types/Settings";

@injectable()
export class LeaderSelectorCompatible {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(MultichainArchitectureDetector) multichainArchitectureDetector!: MultichainArchitectureDetector;

  // TODO remove after update all external validators to multichain version
  async apply(dataTimestamp: number, masterChainStatus: ChainStatus, roundLength: number): Promise<string> {
    const { chainId } = this.settings.blockchain.masterChain;
    const newArchitecture = await this.multichainArchitectureDetector.apply(chainId);
    this.logger.info(`[${chainId}] LeaderSelectorCompatible: newArchitecture ${newArchitecture}`);
    return newArchitecture ? LeaderSelector.apply(dataTimestamp, masterChainStatus, roundLength) : masterChainStatus.nextLeader;
  }
}

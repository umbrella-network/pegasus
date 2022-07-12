import { ChainStatusExtended } from "../../types/ChainStatus";

/*
  leader is selected in predictable, circular way,
  for provider `consensusTimestamp` leader will be always the same (edge case is when we change padding or validators)
  predictable leader for timestamp allow us to get rid of "you are not a leader" errors
  that way, if leader is a bit late, his signature call will not be rejected, because he will be always a leader
  for provided `consensusTimestamp`, he should be rejected only when data is too old.
*/
class LeaderSelector {
  static apply = (consensusTimestamp: number, chainStatuses: ChainStatusExtended[]): string => {
    return LeaderSelector.getLeaderAddressAtTime(consensusTimestamp, chainStatuses);
  };

  static getLeaderAddressAtTime = (consensusTimestamp: number, statuses: ChainStatusExtended[]): string => {
    const masterChain = LeaderSelector.findMasterChain(statuses);
    const validatorIndex = LeaderSelector.getLeaderIndex(consensusTimestamp, statuses);
    return masterChain.validators[validatorIndex];
  }

  static getLeaderIndex = (consensusTimestamp: number, statuses: ChainStatusExtended[]): number => {
    const masterChain = LeaderSelector.findMasterChain(statuses);
    return Math.trunc(consensusTimestamp / masterChain.timePadding) % masterChain.validators.length;
  }

  private static findMasterChain = (statuses: ChainStatusExtended[]): ChainStatusExtended => {
    const masterChain = statuses.find(s => s.masterChain);
    if (!masterChain) throw Error('[LeaderSelector] master chain not found');

    if (masterChain.validators.length == 0) throw Error('[LeaderSelector] empty validators');

    return masterChain;
  }
}

export default LeaderSelector;

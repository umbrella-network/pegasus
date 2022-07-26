import {ChainStatus} from '../../types/ChainStatus';

/*
  leader is selected in predictable, circular way,
  for provider `consensusTimestamp` leader will be always the same (edge case is when we change padding or validators)
  predictable leader for timestamp allow us to get rid of "you are not a leader" errors
  that way, if leader is a bit late, his signature call will not be rejected, because he will be always a leader
  for provided `consensusTimestamp`, he should be rejected only when data is too old.
*/
class LeaderSelector {
  static apply(consensusTimestamp: number, masterChainStatus: ChainStatus): string {
    return LeaderSelector.getLeaderAddressAtTime(consensusTimestamp, masterChainStatus);
  }

  static getLeaderAddressAtTime = (consensusTimestamp: number, masterChainStatus: ChainStatus): string => {
    const validatorIndex = LeaderSelector.getLeaderIndex(consensusTimestamp, masterChainStatus);
    return masterChainStatus.validators[validatorIndex];
  };

  static getLeaderIndex = (consensusTimestamp: number, masterChainStatus: ChainStatus): number => {
    return Math.trunc(consensusTimestamp / masterChainStatus.timePadding) % masterChainStatus.validators.length;
  };
}

export default LeaderSelector;

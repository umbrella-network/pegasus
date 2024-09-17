import {Validator} from '../../types/Validator.js';

/*
  leader is selected in predictable, circular way,
  for provider `consensusTimestamp` leader will be always the same (edge case is when we change padding or validators)
  predictable leader for timestamp allow us to get rid of "you are not a leader" errors
  that way, if leader is a bit late, his signature call will not be rejected, because he will be always a leader
  for provided `consensusTimestamp`, he should be rejected only when data is too old.
*/

export class LeaderSelector {
  static apply(consensusTimestamp: number, validators: Validator[], roundLength: number): Validator {
    if (validators.length == 0) {
      throw new Error('LeaderSelector.apply: empty validators');
    }

    return LeaderSelector.getLeaderAddressAtTime(consensusTimestamp, validators, roundLength);
  }

  static getLeaderAddressAtTime = (
    consensusTimestamp: number,
    validators: Validator[],
    roundLength: number,
  ): Validator => {
    if (validators.length == 0) {
      throw new Error('LeaderSelector.apply: empty validators');
    }

    const validatorIndex = LeaderSelector.getLeaderIndex(consensusTimestamp, validators, roundLength);
    return validators[validatorIndex];
  };

  static getLeaderIndex = (consensusTimestamp: number, validators: Validator[], roundLength: number): number => {
    if (validators.length == 0) {
      return -1;
    }

    return Math.trunc(consensusTimestamp / roundLength) % validators.length;
  };
}

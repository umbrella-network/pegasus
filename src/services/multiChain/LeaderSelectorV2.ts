import {injectable} from "inversify";

/*
  leader is selected in predictable, circular way,
  for provider `consensusTimestamp` leader will be always the same (edge case is when we change padding or validators)
  predictable leader for timestamp allow us to get rid of "you are not a leader" errors
  that way, if leader is a bit late, his signature call will not be rejected, because he will be always a leader
  for provided `consensusTimestamp`, he should be rejected only when data is too old.
*/

@injectable()
export class LeaderSelectorV2 {
  apply(consensusTimestamp: number, validators: string[], roundLength: number): string {
    if (validators.length == 0) {
      return '';
    }

    return this.getLeaderAddressAtTime(consensusTimestamp, validators, roundLength);
  }

  protected getLeaderAddressAtTime = (consensusTimestamp: number, validators: string[], roundLength: number): string => {
    if (validators.length == 0) {
      return '';
    }

    const validatorIndex = this.getLeaderIndex(consensusTimestamp, validators, roundLength);
    return validators[validatorIndex];
  };

  protected getLeaderIndex = (consensusTimestamp: number, validators: string[], roundLength: number): number => {
    if (validators.length == 0) {
      return -1;
    }

    return Math.trunc(consensusTimestamp / roundLength) % validators.length;
  };
}

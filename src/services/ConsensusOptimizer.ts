import {inject, injectable} from 'inversify';
import {Combination} from 'js-combinatorics';
import {Logger} from 'winston';

type Participant = {
  address: string;
  power: bigint;
  discrepancies: string[];
};

type Constraints = {
  minimumRequiredPower: bigint;
  minimumRequiredSignatures: number;
};

export type ConsensusOptimizerProps = {
  participants: Participant[];
  constraints: Constraints;
};

export type ConsensusOptimization = {
  participants: Participant[];
  power: BigInt;
  signatures: number;
  dropKeys: Set<string>;
};

@injectable()
export class ConsensusOptimizer {
  @inject('Logger')
  logger!: Logger;

  readonly MAX_CANDIDATE_DISCREPANCIES = 300;

  // Objective: find the consensus solution that drops the least amount of keys
  // A consensus is a list of participants that, if certain keys are dropped,
  // can provide the necessary power and signatures.
  apply(props: ConsensusOptimizerProps): Set<string> | undefined {
    const {
      participants,
      constraints: {minimumRequiredSignatures, minimumRequiredPower},
    } = props;

    if (this.everyoneAgrees(participants)) {
      this.logger.info('All participants agree. Keeping all keys.');
      return new Set<string>();
    }

    // first, remove participants that have too many discrepancies. These should be outliers.
    // Also remove validators with power = 0
    const candidates = this.selectQualifyingParticipants(participants);
    if (candidates.length < minimumRequiredSignatures) {
      this.logger.info('Not enough candidates to achieve consensus');
      this.logger.info(`Required: ${minimumRequiredSignatures} | Found: ${candidates.length}`);
      return;
    }

    let solution: ConsensusOptimization | undefined = undefined;

    // iterate over the combination of validators
    // starting with the quantity necessary to achieve consensus
    for (let k = minimumRequiredSignatures; k < candidates.length; k++) {
      const combinations = new Combination(candidates, k);

      for (let n = 0; n < combinations.length; n++) {
        const proposedCandidates = combinations.nth(n);
        if (!proposedCandidates) continue;

        const proposal = this.solutionFor(proposedCandidates);
        if (proposal.power < minimumRequiredPower) continue;
        solution ||= proposal;

        if (solution) {
          solution = solution.dropKeys.size > proposal.dropKeys.size ? proposal : solution;
        } else {
          solution = proposal;
        }
      }

      if (solution) return solution.dropKeys;
    }

    return;
  }

  private everyoneAgrees(participants: Participant[]): boolean {
    return participants.every((p) => p.discrepancies.length === 0);
  }

  private selectQualifyingParticipants(participants: Participant[]): Participant[] {
    return participants
      .filter((candidate) => candidate.power != BigInt(0))
      .filter((candidate) => candidate.discrepancies.length <= this.MAX_CANDIDATE_DISCREPANCIES);
  }

  private solutionFor(candidates: Participant[]): ConsensusOptimization {
    return {
      participants: candidates,
      power: candidates.map((c) => c.power).reduce((acc, v) => acc + v, BigInt(0)),
      signatures: candidates.length,
      dropKeys: new Set(candidates.map((c) => c.discrepancies).flat())
    };
  }
}

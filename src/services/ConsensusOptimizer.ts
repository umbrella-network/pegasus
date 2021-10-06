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
  discrepancies: string[];
};

@injectable()
export class ConsensusOptimizer {
  @inject('Logger')
  logger!: Logger;

  readonly MAX_CANDIDATE_DISCREPANCIES = 100;
  readonly CIRCUIT_BREAKER = 100;
  readonly MAX_OPTIMIZATION_ITERATIONS = 10000;

  // Objective: find the consensus solution that drops the least amount of keys
  // A consensus is a list of participants that, if certain keys are dropped,
  // can provide the necessary power and signatures.
  apply(props: ConsensusOptimizerProps): Set<string> {
    const {participants, constraints} = props;

    if (this.everyoneAgrees(participants)) {
      this.logger.info('All participants agree. Keeping all keys.');
      return new Set<string>();
    }

    // first, remove participants that have too many discrepancies. These should be outliers.
    // Also remove validators with power = 0
    const candidates = this.selectQualifyingParticipants(participants);
    // narrow solution set to droppable keys by using only discrepant ones.
    const discrepancies = this.getDiscrepantSet(candidates);

    // Too many droppable keys would kill the application given the brute force approach.
    if (discrepancies.size >= this.CIRCUIT_BREAKER) {
      this.logger.info(`Too many discrepancies to optimize (${discrepancies.size} discrepancies).`);
      this.logger.info(`Removing all discrepancies: ${discrepancies}`);
      return discrepancies;
    }

    // iterate over all K-combinations of the droppable key set, checking if the solution meets the constraints.
    // Start with K = 1 and increase.
    // Accept the highest power solution for a given K
    let solution = new Set<string>();

    for (let k = 1; k < discrepancies.size; k++) {
      const combinations = new Combination(discrepancies, k);

      for (let n = 0; n < combinations.length; n++) {
        if (n > this.MAX_OPTIMIZATION_ITERATIONS) break;

        const proposal = n > 1000 ? combinations.sample() : combinations.nth(n);
        if (!proposal) continue;

        const consensus = this.solutionFor(candidates, constraints, proposal);
        if (!consensus) continue;

        solution = new Set<string>(proposal);
        break;
      }

      if (solution.size > 0) break;
    }

    this.logger.info(`Optimization found - removing: ${solution}`);
    return solution;
  }

  private everyoneAgrees(participants: Participant[]): boolean {
    return participants.filter((p) => p.discrepancies.length > 0).length == 0;
  }

  private selectQualifyingParticipants(participants: Participant[]): Participant[] {
    return participants
      .filter((candidate) => candidate.power != BigInt(0))
      .filter((candidate) => candidate.discrepancies.length <= this.MAX_CANDIDATE_DISCREPANCIES);
  }

  private getDiscrepantSet(participants: Participant[]): Set<string> {
    return participants
      .map((participant) => participant.discrepancies)
      .flat()
      .reduce((acc, k) => acc.add(k), new Set<string>());
  }

  private solutionFor(
    candidates: Participant[],
    constraints: Constraints,
    proposal: string[],
  ): ConsensusOptimization | undefined {
    const {minimumRequiredPower, minimumRequiredSignatures} = constraints;
    const qualifyingCandidates = candidates.filter(
      (candidate) => candidate.discrepancies.filter((d) => !proposal.includes(d)).length == 0,
    );

    if (qualifyingCandidates.length < minimumRequiredSignatures) return;

    const power = qualifyingCandidates
      .map((candidate) => candidate.power)
      .reduce((acc, p) => p + acc, BigInt(0));

    if (power < minimumRequiredPower) return;

    return {
      participants: qualifyingCandidates,
      signatures: qualifyingCandidates.length,
      discrepancies: proposal,
      power,
    };
  }
}

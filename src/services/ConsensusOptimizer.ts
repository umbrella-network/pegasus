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

  readonly PARTICIPATION_CUTOFF = 10;
  readonly CIRCUIT_BREAKER = 10;

  // Objective: find the consensus solution that drops the least amount of keys
  // A consensus is a list of participants that, if certain keys are dropped,
  // can provide the necessary power and signatures.
  apply(props: ConsensusOptimizerProps): string[] {
    const {participants, constraints} = props;

    if (this.everyoneAgrees(participants)) {
      this.logger.info('All participants agree. Keeping all keys.');
      return [];
    }

    // first, remove participants that have too many discrepancies. These should be outliers.
    const candidates = this.filterParticipantsByCutoff(participants);
    // narrow solution set to droppable keys by using only discrepant ones.
    const discrepancies = this.getDiscrepantSet(candidates);

    // Too many droppable keys would kill the application given the brute force approach.
    if (discrepancies.size >= this.CIRCUIT_BREAKER) {
      this.logger.info(`Too many discrepancies to optimize (${discrepancies.size} discrepancies).`);
      this.logger.info(`Removing all discrepancies: ${discrepancies}`);
      return Array.from(discrepancies.values());
    }

    // iterate over all K-combinations of the droppable key set, checking if the solution meets the constraints.
    // Start with K = 1 and increase.
    // Accept the highest power solution for a given K
    let solution: string[] = [];

    for (let k = 1; k < discrepancies.size; k++) {
      const combinations = new Combination(discrepancies, k);

      for (let n = 0; n < combinations.length; n++) {
        const proposal = combinations.nth(n);
        if (!proposal) continue;

        const consensus = this.solutionFor(candidates, constraints, proposal);
        if (!consensus) continue;

        solution = proposal;
        break;
      }

      if (solution.length > 0) break;
    }

    this.logger.info(`Optimization found - removing: ${solution}`);
    return solution;
  }

  private everyoneAgrees(participants: Participant[]): boolean {
    return participants.filter((p) => p.discrepancies.length > 0).length == 0;
  }

  private everyoneDisagrees(participants: Participant[], elements: string[]): boolean {
    return !participants.map((p) => p.discrepancies.length == elements.length).includes(false);
  }

  private filterParticipantsByCutoff(participants: Participant[]): Participant[] {
    return participants.filter((participant) => participant.discrepancies.length <= this.PARTICIPATION_CUTOFF);
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

    const power = qualifyingCandidates.map((candidate) => candidate.power).reduce((acc, p) => p + acc, BigInt(0));

    if (power < minimumRequiredPower) return;

    return {
      participants: qualifyingCandidates,
      signatures: qualifyingCandidates.length,
      discrepancies: proposal,
      power,
    };
  }
}

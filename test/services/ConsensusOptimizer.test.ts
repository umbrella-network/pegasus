import 'reflect-metadata';
import {ConsensusOptimizer, ConsensusOptimizerProps} from '../../src/services/ConsensusOptimizer';
import sinon from 'sinon';
import {expect} from 'chai';

// type Props = {
//   discrepancies: Record<string, string[]>; // 'VALIDATOR_ADDRESS': ['eth-usd'] - this guys can't agree with my value of this key
//   powers: Record<string, bigint>; // 'VALIDATOR_ADDRESS': power
//   minimumPower: bigint; // how much power is needed to reach consensus - sum of powers of validators in agreement
//   minimumRequiredSignatures: number; // how many signatures are needed for enough consensus
// }
//
// class ConsensusOptimizer {
//   apply(props: Props): string[] // array of the minimum amount of keys (ex: coin pairs) that need to be dropped to reach consensus
// }

// Best possible consensus is that which minimizes the amount of keys that need to be dropped

describe('#apply', () => {
  let instance: ConsensusOptimizer;
  let props: ConsensusOptimizerProps;
  let result: string[];
  const subject = (props: ConsensusOptimizerProps) => instance.apply(props);

  before(() => {
    instance = new ConsensusOptimizer();
  });

  after(() => {
    sinon.restore();
  });

  describe('when all validators agree', () => {
    before(() => {
      props = {
        collection: ['kp1', 'kp2', 'kp3'],
        participants: [
          {
            address: 'VALIDATOR_1',
            power: BigInt(1),
            discrepancies: []
          },
          {
            address: 'VALIDATOR_2',
            power: BigInt(1),
            discrepancies: []
          },
        ],
        constraints: {
          minimumRequiredPower: BigInt(1000),
          minimumRequiredSignatures: 3
        }
      };

      result = subject(props);
    });

    it('returns an empty string array', () => {
      expect(result).to.be.empty;
    });
  });

  describe('when all validators disagree', () => {
    before(() => {
      props = {
        collection: ['kp1', 'kp2', 'kp3'],
        participants: [
          {
            address: 'VALIDATOR_1',
            power: BigInt(1),
            discrepancies: ['kp1', 'kp2', 'kp3']
          },
          {
            address: 'VALIDATOR_2',
            power: BigInt(1),
            discrepancies: ['kp1', 'kp2', 'kp3']
          },
        ],
        constraints: {
          minimumRequiredPower: BigInt(1000),
          minimumRequiredSignatures: 3
        }
      };

      result = subject(props);
    });

    it('returns all keys', () => {
      expect(result).to.have.members(['kp1', 'kp2', 'kp3'])
    });
  });

  describe('when some validators disagree', () => {
    before(() => {
      props = {
        collection: ['kp1', 'kp2', 'kp3'],
        participants: [
          {
            address: 'VALIDATOR_1',
            power: BigInt(5),
            discrepancies: []
          },
          {
            address: 'VALIDATOR_2',
            power: BigInt(5),
            discrepancies: ['kp2']
          },
          {
            address: 'VALIDATOR_3',
            power: BigInt(5),
            discrepancies: ['kp1', 'kp3']
          },
          {
            address: 'VALIDATOR_4',
            power: BigInt(5),
            discrepancies: ['kp3']
          },
          {
            address: 'VALIDATOR_5',
            power: BigInt(10),
            discrepancies: ['kp2']
          },
        ],
        constraints: {
          minimumRequiredPower: BigInt(20),
          minimumRequiredSignatures: 3
        }
      };

      result = subject(props);
    });

    it('returns the keys to be excluded to achieve the best consensus', () => {
      expect(result).to.have.length(1);
      expect(result).to.have.members(['kp2']);
    });
  });
});

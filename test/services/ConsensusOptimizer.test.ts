import 'reflect-metadata';
import {ConsensusOptimizer, ConsensusOptimizerProps} from '../../src/services/ConsensusOptimizer';
import sinon from 'sinon';
import {expect} from 'chai';
import {Container} from 'inversify';
import {getTestContainer} from '../helpers/getTestContainer';

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
  let container: Container;
  let instance: ConsensusOptimizer;
  let props: ConsensusOptimizerProps;
  let result: Set<string>;
  const subject = (props: ConsensusOptimizerProps) => instance.apply(props);

  before(() => {
    container = getTestContainer();
    instance = container.get(ConsensusOptimizer);
  });

  after(() => {
    sinon.restore();
  });

  describe('when all validators agree', () => {
    before(() => {
      props = {
        participants: [
          {
            address: 'VALIDATOR_1',
            power: BigInt(1),
            discrepancies: [],
          },
          {
            address: 'VALIDATOR_2',
            power: BigInt(1),
            discrepancies: [],
          },
        ],
        constraints: {
          minimumRequiredPower: BigInt(1000),
          minimumRequiredSignatures: 3,
        },
      };

      result = subject(props);
    });

    it('returns an empty string array', () => {
      expect(result).to.be.empty;
    });
  });

  describe('when some validators disagree', () => {
    before(() => {
      props = {
        participants: [
          {
            address: 'VALIDATOR_1',
            power: BigInt(5),
            discrepancies: [],
          },
          {
            address: 'VALIDATOR_2',
            power: BigInt(5),
            discrepancies: ['kp2'],
          },
          {
            address: 'VALIDATOR_3',
            power: BigInt(5),
            discrepancies: ['kp1', 'kp3'],
          },
          {
            address: 'VALIDATOR_4',
            power: BigInt(5),
            discrepancies: ['kp3'],
          },
          {
            address: 'VALIDATOR_5',
            power: BigInt(10),
            discrepancies: ['kp2'],
          },
        ],
        constraints: {
          minimumRequiredPower: BigInt(20),
          minimumRequiredSignatures: 3,
        },
      };

      result = subject(props);
    });

    it('returns the keys to be excluded to achieve the best consensus', () => {
      expect(result).to.have.length(1);
      expect(result).to.include('kp2');
    });
  });
});

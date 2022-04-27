import {expect} from 'chai';
import {mergeArrays, splitIntoBatches} from '../../src/utils/collections';

describe('collections', () => {
  describe('.mergeArrays', () => {
    describe('with EMPTY positions', () => {
      const arrA = [1, , 3, , 5]; // eslint-disable-line no-sparse-arrays

      describe('and same size complementary arrays', () => {
        it('merges arrays', () => {
          const arrB = [, 2, , 4]; // eslint-disable-line no-sparse-arrays
          arrB.length = 5;

          const result = mergeArrays(arrA, arrB);

          expect(result).to.deep.equal([1, 2, 3, 4, 5]);
        });
      });

      describe('and different size arrays', () => {
        it('merges arrB into arrA', () => {
          const arrB = [, 2]; // eslint-disable-line no-sparse-arrays

          const result = mergeArrays(arrA, arrB);

          expect(result).to.deep.equal([1, 2, 3, undefined, 5]);
        });
      });

      describe('and conflicting positions', () => {
        it('keeps arrA values', () => {
          const arrB = [5, 4, 3, 2, 1];

          const result = mergeArrays(arrA, arrB);

          expect(result).to.deep.equal([1, 4, 3, 2, 5]);
        });
      });
    });

    describe('with UNDEFINED positions', () => {
      const arrA = [1, undefined, 3, undefined, 5];

      describe('and same size complementary arrays', () => {
        it('merges arrays', () => {
          const arrB = [undefined, 2, undefined, 4, undefined];

          const result = mergeArrays(arrA, arrB);

          expect(result).to.deep.equal([1, 2, 3, 4, 5]);
        });
      });

      describe('and different size arrays', () => {
        it('merges arrB into arrA', () => {
          const arrB = [undefined, 2];

          const result = mergeArrays(arrA, arrB);

          expect(result).to.deep.equal([1, 2, 3, undefined, 5]);
        });
      });
    });
  });

  describe('.splitIntoBatches', () => {
    describe('splitting an array of numbers', () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const batchSize = 2;
      const result = splitIntoBatches(input, batchSize);

      it('returns batches', () => {
        expect(result).to.deep.equal([[1, 2], [3, 4], [5, 6], [7, 8], [9]]);
      });

      it('does not mutate the input', () => {
        expect(input).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      });
    });

    describe('splitting an array of objects', () => {
      const input = [
        {a: 1, b: 'foo'},
        {a: 2, b: 'bar'},
        {a: 3, b: 'foo'},
      ];
      const batchSize = 2;

      const result = splitIntoBatches(input, batchSize);

      it('returns batches', () => {
        expect(result).to.deep.equal([
          [
            {a: 1, b: 'foo'},
            {a: 2, b: 'bar'},
          ],
          [{a: 3, b: 'foo'}],
        ]);
      });
    });
  });
});

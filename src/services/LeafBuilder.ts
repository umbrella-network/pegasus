import {LeafValueCoder} from '@umb-network/toolbox';
import {price} from '@umb-network/validator';
import {injectable} from 'inversify';
import Leaf from '../types/Leaf';

@injectable()
class LeafBuilder {
  public calculateMean(values: number[], leafLabel: string, precision: number): Leaf {
    const multi = Math.pow(10, precision);

    const result = Math.round(price.mean(values) * multi) / multi;

    return this.buildLeaf(leafLabel, result);
  }

  private buildLeaf(label: string, value: number): Leaf {
    return {
      label,
      valueBytes: `0x${LeafValueCoder.encode(value, label).toString('hex')}`,
    };
  }
}

export default LeafBuilder;

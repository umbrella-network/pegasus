import axios from 'axios';
import {LeafValueCoder} from '@umb-network/toolbox';

import {calcNumberDiscrepancy} from '../../utils/math';
import {injectable} from 'inversify';

@injectable()
export class CompareValidatorService {
  async apply(): Promise<void> {
    await this.compareValidators([
      //'http://localhost:3000',
      'https://validator.umb.network',
      'https://validator2.umb.network',
      'https://umb.stakers.world',
      'https://razumv-umb.razumv.tech',
      'https://umb.anorak.technology',
      'https://markusrichard-umb.markusrichard.tech',
      'https://santanika-umb.santanika.tech',
      'https://staging.umbvnode.com',
      'https://umb.hashquark.io',
      'https://umbrella.infinitystones.us',
      'https://umb-api.staking.rocks',
      // 'https://umb.validator.gunu-node.com',
      // 'https://umbrella-api.validatrium.club',
      'https://umbnode.blockchainliverpool.com',
      'https://umbnode.nova-tech.io',
      'https://umbvalidator.roadhosts.com',
      'https://umbrella.artemahr.tech',
      'https://umb.web3.in.ua',
      'https://umbrella-node.gateomega.com',
    ]);
  }

  private async getDataPairs(url: string) {
    const res = await axios.get(url, {
      headers: {
        Authorization: 'Bearer',
      },
      timeout: 20000,
    });
    return res.data;
  }

  private compareValueBytes(label: string, value1: string, value2: string) {
    if (LeafValueCoder.isFixedValue(label)) {
      return value1 === value2;
    }

    const n1 = LeafValueCoder.decode(value1, label) as number;
    const n2 = LeafValueCoder.decode(value2, label) as number;

    const disc = calcNumberDiscrepancy(n1, n2) * 100;

    return disc < 1;
  }

  private minIndex(values: number[]) {
    return values.indexOf(Math.min(...values));
  }

  private maxIndex(values: number[]) {
    return values.indexOf(Math.max(...values));
  }

  private average(values: number[]) {
    return values.reduce((a, b) => a + b) / values.length;
  }

  private async compareValidators(validators: string[]): Promise<void> {
    console.log(`Comparing ${validators}`);

    const timestamp = Math.floor(Date.now() / 1000);
    const limitBetweenTimestamp = 10;

    console.log('Limit between Date pairs: ', limitBetweenTimestamp);

    const responses = await Promise.all(
      validators.map((url) => this.getDataPairs(`${url}/debug/feeds?timestamp=${timestamp}`)),
    );

    const allDataTimestamps: number[] = [];
    const allFetchFeedsMs: number[] = [];
    const allProcessFeedsMs: number[] = [];

    const allMaps: Map<string, string>[] = [];
    const allKeys = new Set<string>();

    responses.forEach(({dataTimestamp, fetchFeedsMs, processFeedsMs, leaves, firstClassLeaves}, i) => {
      allDataTimestamps.push(dataTimestamp);
      allFetchFeedsMs.push(fetchFeedsMs);
      allProcessFeedsMs.push(processFeedsMs);
      const gap = this.maxIndex(allDataTimestamps) - this.minIndex(allDataTimestamps);

      if (gap >= limitBetweenTimestamp) {
        throw new Error(`Data pairs timestamp difference is bigger than ${limitBetweenTimestamp}`);
      }

      leaves.forEach(({label, valueBytes}: any) => {
        allKeys.add(label);
        if (!allMaps[i]) {
          allMaps[i] = new Map<string, string>();
        }
        allMaps[i].set(label, valueBytes);
      });
      firstClassLeaves.forEach(({label, valueBytes}: any) => {
        allKeys.add(label);
        if (!allMaps[i]) {
          allMaps[i] = new Map<string, string>();
        }
        if (allMaps[i].has(label) && valueBytes !== allMaps[i].get(label)) {
          throw new Error(`Values in FCDs and leaves are different for label ${label} on validator ${validators[i]}`);
        }
        allMaps[i].set(label, valueBytes);
      });
    });

    console.log(`All keys: ${allKeys.size}`);

    console.log(`Fetch feeds:`);
    console.log(`avg=${this.average(allFetchFeedsMs)}`);
    console.log(`min=${Math.min(...allFetchFeedsMs)}; ${validators[this.minIndex(allFetchFeedsMs)]}`);
    console.log(`max=${Math.max(...allFetchFeedsMs)}; ${validators[this.maxIndex(allFetchFeedsMs)]}`);
    console.log(`Process feeds:`);
    console.log(`avg=${this.average(allProcessFeedsMs)}`);
    console.log(`min=${Math.min(...allProcessFeedsMs)}; ${validators[this.minIndex(allProcessFeedsMs)]}`);
    console.log(`max=${Math.max(...allProcessFeedsMs)}; ${validators[this.maxIndex(allProcessFeedsMs)]}`);

    const discrepancies = new Set<string>();

    console.log(`Discrepancies:`);

    allKeys.forEach((label) => {
      let valueBytes: string | undefined = undefined;

      for (let i = 0; i < validators.length; ++i) {
        const nextValueBytes = allMaps[i].get(label);
        if (!valueBytes) {
          valueBytes = nextValueBytes;
        }

        if (!nextValueBytes || !this.compareValueBytes(label, valueBytes!, nextValueBytes)) {
          discrepancies.add(label);

          console.log(`${label}*****`);
          for (let j = 0; j < validators.length; ++j) {
            const valueBytes = allMaps[j].get(label);
            console.log(
              `${validators[j]}: ${valueBytes ? LeafValueCoder.decode(valueBytes, label) : '???'}=${valueBytes}`,
            );
          }
          console.log(`********************`);

          break;
        }
      }
    });

    console.log(`Total ${discrepancies.size} discrepancies:`);
    console.log(discrepancies);
  }
}

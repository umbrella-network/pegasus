import {price} from '@umb-network/validator';

export const calculateTWAP = (value: [price.BarPrice, unknown][]): number => {
  return price.timeWeightedAveragePrice(value.map(([barPrice]) => barPrice));
};

export const calculateVWAP = (value: [price.BarPrice, number][]): number => {
  return price.volumeWeightedAveragePriceWithBars(value);
};

export const calculateIdentity = <T>(value: T): T => {
  return value;
};

import {TimeoutCodes} from '../types/TimeoutCodes.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export const mapParams = (params: any): string => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const objects: any[] = [];
  Object.keys(params)
    .filter((item) => item)
    .forEach((key) => {
      if (Array.isArray(params[key])) {
        // eslint-disable-next-line
        params[key].forEach((value: any) => {
          objects.push({key, value});
        });
      } else {
        objects.push({key, value: params[key]});
      }
    });

  const string = objects.reduce((accumulator, {key, value}) => {
    if (value === undefined || value === null) {
      return accumulator;
    }
    return `${accumulator ? `${accumulator}&` : accumulator}${key}=${value}`;
  }, '');
  return string && `?${string}`;
};

export const timeoutWithCode = (n: number | string, code: TimeoutCodes): number => {
  const t = typeof n === 'number' ? n : parseInt(n, 10);
  const maximumCodeValue = 10 ** (Object.keys(TimeoutCodes).length / 2).toString(10).length;
  if (t < maximumCodeValue) throw Error(`timeout must be > ${maximumCodeValue}, got ${t}`);

  return Math.trunc(t / maximumCodeValue) * maximumCodeValue + code;
};

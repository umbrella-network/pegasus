export const calcDiscrepancy = (val1: number, val2: number): number => {
  return (2 * Math.abs(val1 - val2)) / (val1 + val2);
};

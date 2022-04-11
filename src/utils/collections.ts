export function mergeArrays(arrA: unknown[], arrB: unknown[]): unknown[] {
  const result: unknown[] = [];

  for (let i = 0; i < arrA.length; i++) {
    result[i] = arrA[i] ?? arrB[i];
  }

  return result;
}

export function splitIntoBatches(arr: unknown[], maxBatchSize: number): unknown[][] {
  const batches: unknown[][] = [];
  const arrCopy = [...arr];

  while (arrCopy.length) {
    const batch = arrCopy.splice(0, maxBatchSize);
    batches.push(batch);
  }

  return batches;
}

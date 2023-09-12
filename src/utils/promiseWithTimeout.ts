export const promiseWithTimeout = <T>(promise: Promise<T>, timeout: number): Promise<T> => {
  const timeoutPromise = new Promise<never>((resolve, reject) => {
    setTimeout(() => {
      reject(new Error(`promiseWithTimeout: request timed out: ${timeout}`));
    }, timeout);
  });

  return Promise.race([promise, timeoutPromise]);
};

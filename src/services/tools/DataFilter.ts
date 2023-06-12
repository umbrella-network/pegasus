export class DataFilter {
  static filter<T>(data: Record<string, T>, acceptedKeys: string[]): Record<string, T> {
    const results: Record<string, T> = {};

    acceptedKeys.forEach((key) => {
      if (data[key]) {
        results[key] = data[key];
      }
    });

    return results;
  }

  static mutate<T>(data: Record<string, T>, acceptedKeys: string[]): string[] {
    const accepted = new Set(acceptedKeys);
    const existingKeys = new Set(Object.keys(data));
    const removed: string[] = [];

    existingKeys.forEach((key) => {
      if (!accepted.has(key)) {
        delete data[key];
        removed.push(key);
      }
    });

    return removed;
  }
}

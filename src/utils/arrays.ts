export function uniqueElements(a: string[]): string[] {
  const unique: Record<string, string> = {};
  a.forEach((el) => (unique[el] = el));
  return Object.keys(unique);
}

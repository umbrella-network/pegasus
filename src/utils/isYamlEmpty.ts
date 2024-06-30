export function isYamlEmpty(yamlContent: string): boolean {
  return yamlContent.split('\n').every((line) => {
    if (!line) return true;
    if (line.startsWith('#')) return true;
    return line.replace(/ /g, '').length == 0;
  });
}

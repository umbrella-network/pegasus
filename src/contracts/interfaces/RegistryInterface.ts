export interface RegistryInterface {
  getAddress(name: string): Promise<string>;
}

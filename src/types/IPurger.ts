export interface IPurger {
  purge(): Promise<number>;
}

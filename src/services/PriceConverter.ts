class PriceConverter {
  readonly INTERMEDIARIES = ['USD', 'EUR', 'BTC', 'ETH'];

  prices: {[key: string]: number};

  constructor(prices: {[key: string]: number}) {
    this.prices = prices;
  }

  apply(from: string, to: string): number | undefined {
    const price = this.findPrice(from, to);
    if (price) {
      return price;
    }

    for (const intermediary of this.INTERMEDIARIES) {
      const t1 = this.findPrice(from, intermediary),
        t2 = this.findPrice(to, intermediary);

      if (t1 && t2) {
        return t1 / t2;
      }
    }

    return undefined;
  }

  findPrice(from: string, to: string): number | undefined {
    const dir1 = `${from}-${to}`;
    if (this.prices[dir1]) {
      return this.prices[dir1];
    }

    const dir2 = `${to}-${from}`;
    if (this.prices[dir2]) {
      return 1 / this.prices[dir1];
    }
  }
}

export default PriceConverter;

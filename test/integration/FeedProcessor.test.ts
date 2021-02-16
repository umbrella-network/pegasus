import { Container } from "inversify";
import { loadTestEnv } from "../helpers/loadTestEnv";
import FeedProcessor from "../../src/services/FeedProcessor";
import loadFeeds from "../../src/config/loadFeeds";
import { expect } from "chai";
import { mockedLogger } from "../mocks/logger";
import { testingLogger } from "../helpers/testingLogger";
import Feeds from "../../src/types/Feed";

const config = loadTestEnv();

describe("FeedProcessor integration tests", () => {
  let feedProcessor: FeedProcessor;
  let feeds: Feeds;

  beforeEach(async () => {
    const container = new Container({ autoBindInjectable: true });
    container.bind("Logger").toConstantValue(mockedLogger);
    container.bind("Settings").toConstantValue({
      api: {
        cryptocompare: {
          apiKey: config.CRYPTOCOMPARE_API_KEY,
          timeout: parseInt(process.env.CRYPTOCOMPARE_TIMEOUT || "5000", 10),
        },
        genesisVolatility: {
          apiKey: config.GENESIS_VOLATILITY_API_KEY,
          timeout: parseInt(
            process.env.GENESIS_VOLATILITY_TIMEOUT || "5000",
            10
          ),
        },
        polygonIO: {
          apiKey: config.POLYGON_IO_API_KEY,
          timeout: parseInt(process.env.POLYGON_IO_TIMEOUT || "5000", 10),
        },
        iex: {
          apiKey: config.IEX_API_KEY,
          timeout: (parseInt(process.env.IEX_TIMEOUT || '5000', 10))
        }
      },
    });

    container.bind(FeedProcessor).toSelf();

    feedProcessor = container.get(FeedProcessor);
    feeds = await loadFeeds("src/config/feeds.yaml");
  });

  if (config.CRYPTOCOMPARE_API_KEY) {
    it("returns data for feeds with CryptoCompareHistoDay fetcher", async () => {
      const feedsWithCryptoCompareHistoDayFetcher = Object.keys(feeds)
        .filter(
          (feedName) =>
            feeds[feedName].inputs[0].fetcher.name === "CryptoCompareHistoDay"
        )
        .reduce(
          (acc, feedName) => ({ ...acc, [feedName]: feeds[feedName] }),
          {} as Feeds
        );

      const leaves = await feedProcessor.apply(
        feedsWithCryptoCompareHistoDayFetcher
      );

      expect(leaves)
        .to.be.an("array")
        .that.has.lengthOf(
          Object.keys(feedsWithCryptoCompareHistoDayFetcher).length
        );
    });

    it("returns data for feeds with CryptoCompareHistoHour fetcher", async () => {
      const feedsWithCryptoCompareHistoHourFetcher = Object.keys(feeds)
        .filter(
          (feedName) =>
            feeds[feedName].inputs[0].fetcher.name === "CryptoCompareHistoHour"
        )
        .reduce(
          (acc, feedName) => ({ ...acc, [feedName]: feeds[feedName] }),
          {} as Feeds
        );

      const leaves = await feedProcessor.apply(
        feedsWithCryptoCompareHistoHourFetcher
      );

      expect(leaves)
        .to.be.an("array")
        .that.has.lengthOf(
          Object.keys(feedsWithCryptoCompareHistoHourFetcher).length
        );
    });
  } else {
    testingLogger.warn(
      "Skipping some FeedProcessor integration tests that require CRYPTOCOMPARE_API_KEY"
    );
  }

  if (config.GENESIS_VOLATILITY_API_KEY) {
    it("returns data for feeds with GVolImpliedVolatility fetcher", async () => {
      const feedsWithGVolImpliedVolatilityFetcher = Object.keys(feeds)
        .filter(
          (feedName) =>
            feeds[feedName].inputs[0].fetcher.name === "GVolImpliedVolatility"
        )
        .reduce(
          (acc, feedName) => ({ ...acc, [feedName]: feeds[feedName] }),
          {} as Feeds
        );

      const leaves = await feedProcessor.apply(
        feedsWithGVolImpliedVolatilityFetcher
      );

      expect(leaves)
        .to.be.an("array")
        .that.has.lengthOf(
          Object.keys(feedsWithGVolImpliedVolatilityFetcher).length
        );
    });
  } else {
    testingLogger.warn(
      "Skipping some FeedProcessor integration tests that require GENESIS_VOLATILITY_API_KEY"
    );
  }
});

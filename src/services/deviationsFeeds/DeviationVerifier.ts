import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import Settings from "../../types/Settings";
import Blockchain from "../../lib/Blockchain";
import {FeedDataService} from "../FeedDataService";
import {
  DeviationDataToSign,
  DeviationLeavesAndFeeds,
  DeviationSignerResponse,
} from "../../types/DeviationFeeds";
import {FeedsType} from "../../types/Feed";
import {DiscrepancyFinder} from "../DiscrepancyFinder";
import {KeyValuesToLeaves} from "../tools/KeyValuesToLeaves";
import {PriceMetadataComparator} from "./PriceMetadataComparator";
import {DeviationSigner} from "./DeviationSigner";
import {DeviationChainMetadata} from "./DeviationChainMetadata";

@injectable()
export class DeviationVerifier {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(FeedDataService) feedDataService!: FeedDataService;
  @inject(PriceMetadataComparator) priceDataComperator!: PriceMetadataComparator;
  @inject(DeviationSigner) deviationSigner!: DeviationSigner;
  @inject(DeviationChainMetadata) deviationChainMetadata!: DeviationChainMetadata;

  async apply(deviationDataToSign: DeviationDataToSign): Promise<DeviationSignerResponse> {
    await this.blockchain.setLatestProvider();

    const uniqueKeys = Object.keys(deviationDataToSign.leaves);

    this.logger.info(
      [
        `[DeviationSigner] Request to sign a feeds at ${deviationDataToSign.dataTimestamp}`,
        `with ${uniqueKeys.length} feeds`,
      ].join(' '),
    );

    const {feeds, leaves} = (await this.feedDataService.apply(
      deviationDataToSign.dataTimestamp,
      FeedsType.DEVIATION_TRIGGER,
      uniqueKeys
    )) as DeviationLeavesAndFeeds;

    const discrepancies = DiscrepancyFinder.apply({
      proposedFcds: [],
      proposedLeaves: KeyValuesToLeaves.apply(deviationDataToSign.leaves),
      fcds: [],
      leaves,
      fcdsFeeds: {},
      leavesFeeds: feeds
    });

    if (discrepancies.length) {
      this.logger.info(`[DeviationSigner] Cannot sign all feeds. Discrepancies found: ${discrepancies.length}`);
      this.logger.debug(`[DeviationSigner] Discrepancies: ${JSON.stringify(discrepancies)}`);
      return {discrepancies, version: this.settings.version};
    }

    // at this point, all prices match, no discrepancies
    // generate price data and check if they are the same as external

    try {
       this.priceDataComperator.apply(deviationDataToSign, leaves, feeds);
    } catch (e) {
      this.logger.error(`[DeviationSigner] priceDataComparator failed with ${(e as Error).message}`);
      return {discrepancies: [], error: (e as Error).message, version: this.settings.version};
    }

    // now we ready to sign data

    const chainMetadata = await this.deviationChainMetadata.apply(deviationDataToSign.feedsForChain);

    const signatures = await Promise.all(chainMetadata.map(([chainId, networkId, target]) => {
        const priceDatas = deviationDataToSign.feedsForChain[chainId].map(key => deviationDataToSign.proposedPriceData[key]);

        return this.deviationSigner.apply(networkId, target, deviationDataToSign.feedsForChain[chainId], priceDatas)
      }
    ));

    const signaturesToReturn: Record<string, string> = {};

    chainMetadata.forEach(([chainId], i) => {
      const sig = signatures[i];

      if (sig) {
        signaturesToReturn[chainId] = sig;
      }
    })

    return {signatures: signaturesToReturn, discrepancies, version: this.settings.version};
  }
}

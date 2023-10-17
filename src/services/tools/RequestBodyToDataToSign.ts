import {DeviationDataToSign} from "../../types/DeviationFeeds";

export class RequestBodyToDataToSign {
  static apply(body: unknown): DeviationDataToSign {
    const results = body as DeviationDataToSign;
    const keys = Object.keys(results.proposedPriceData);

    keys.forEach(k => {
      results.proposedPriceData[k] = {
        ...results.proposedPriceData[k],
        price: BigInt(results.proposedPriceData[k].price),
      }
    });

    return results;
  }
}

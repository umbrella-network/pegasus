import * as SDK from '@concordium/web-sdk';
import {PriceData} from '../../../types/DeviationFeeds';
import {ViewMessageHashParameter} from '../contracts/generated/umbrella_feeds_umbrella_feeds';
import {FeedName} from '../../../types/Feed.js';
import {signatureExpireTimestamp} from './signatureExpireTimestamp.js';

export function toViewMessageHashParameter(
  address: SDK.ContractAddress.Type,
  names: FeedName[],
  priceDatas: PriceData[],
  signatures: string[] = [],
): ViewMessageHashParameter {
  const signaturesExpirationTimestamp = signatureExpireTimestamp(priceDatas.length == 0 ? undefined : priceDatas[0]);

  return {
    signers_and_signatures: signatures.map((s) => s.split('@')) as [SDK.HexString, SDK.HexString][],
    message: {
      contract_address: address,
      timestamp: SDK.Timestamp.fromMillis(signaturesExpirationTimestamp * 1000),
      price_feed: names.map((k, i) => {
        const p = priceDatas[i];

        return [
          k,
          {
            data: p.data,
            price: p.price,
            timestamp: SDK.Timestamp.fromMillis(p.timestamp * 1000),
            heartbeat: p.heartbeat,
          },
        ];
      }),
    },
  };
}

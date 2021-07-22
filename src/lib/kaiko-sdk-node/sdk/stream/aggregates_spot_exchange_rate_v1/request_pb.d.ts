// package: kaikosdk
// file: sdk/stream/aggregates_spot_exchange_rate_v1/request.proto

import * as jspb from "google-protobuf";

export class StreamAggregatesSpotExchangeRateRequestV1 extends jspb.Message {
  getCode(): string;
  setCode(value: string): void;

  getAggregate(): string;
  setAggregate(value: string): void;

  getSources(): boolean;
  setSources(value: boolean): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StreamAggregatesSpotExchangeRateRequestV1.AsObject;
  static toObject(includeInstance: boolean, msg: StreamAggregatesSpotExchangeRateRequestV1): StreamAggregatesSpotExchangeRateRequestV1.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: StreamAggregatesSpotExchangeRateRequestV1, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StreamAggregatesSpotExchangeRateRequestV1;
  static deserializeBinaryFromReader(message: StreamAggregatesSpotExchangeRateRequestV1, reader: jspb.BinaryReader): StreamAggregatesSpotExchangeRateRequestV1;
}

export namespace StreamAggregatesSpotExchangeRateRequestV1 {
  export type AsObject = {
    code: string,
    aggregate: string,
    sources: boolean,
  }
}


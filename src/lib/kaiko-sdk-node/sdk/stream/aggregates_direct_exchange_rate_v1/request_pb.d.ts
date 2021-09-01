// package: kaikosdk
// file: sdk/stream/aggregates_direct_exchange_rate_v1/request.proto

import * as jspb from "google-protobuf";

export class StreamAggregatesDirectExchangeRateRequestV1 extends jspb.Message {
  getCode(): string;
  setCode(value: string): void;

  getAggregate(): string;
  setAggregate(value: string): void;

  getSources(): boolean;
  setSources(value: boolean): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StreamAggregatesDirectExchangeRateRequestV1.AsObject;
  static toObject(includeInstance: boolean, msg: StreamAggregatesDirectExchangeRateRequestV1): StreamAggregatesDirectExchangeRateRequestV1.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: StreamAggregatesDirectExchangeRateRequestV1, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StreamAggregatesDirectExchangeRateRequestV1;
  static deserializeBinaryFromReader(message: StreamAggregatesDirectExchangeRateRequestV1, reader: jspb.BinaryReader): StreamAggregatesDirectExchangeRateRequestV1;
}

export namespace StreamAggregatesDirectExchangeRateRequestV1 {
  export type AsObject = {
    code: string,
    aggregate: string,
    sources: boolean,
  }
}


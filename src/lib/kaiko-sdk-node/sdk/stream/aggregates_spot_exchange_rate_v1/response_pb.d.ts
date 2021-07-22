// package: kaikosdk
// file: sdk/stream/aggregates_spot_exchange_rate_v1/response.proto

import * as jspb from "google-protobuf";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";
import * as sdk_stream_aggregates_spot_exchange_rate_v1_source_pb from "../../../sdk/stream/aggregates_spot_exchange_rate_v1/source_pb";

export class StreamAggregatesSpotExchangeRateResponseV1 extends jspb.Message {
  getAggregate(): string;
  setAggregate(value: string): void;

  getCode(): string;
  setCode(value: string): void;

  getPrice(): string;
  setPrice(value: string): void;

  getSequenceId(): string;
  setSequenceId(value: string): void;

  getSourcesMap(): jspb.Map<string, sdk_stream_aggregates_spot_exchange_rate_v1_source_pb.Source>;
  clearSourcesMap(): void;
  hasTimestamp(): boolean;
  clearTimestamp(): void;
  getTimestamp(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setTimestamp(value?: google_protobuf_timestamp_pb.Timestamp): void;

  getUid(): string;
  setUid(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StreamAggregatesSpotExchangeRateResponseV1.AsObject;
  static toObject(includeInstance: boolean, msg: StreamAggregatesSpotExchangeRateResponseV1): StreamAggregatesSpotExchangeRateResponseV1.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: StreamAggregatesSpotExchangeRateResponseV1, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StreamAggregatesSpotExchangeRateResponseV1;
  static deserializeBinaryFromReader(message: StreamAggregatesSpotExchangeRateResponseV1, reader: jspb.BinaryReader): StreamAggregatesSpotExchangeRateResponseV1;
}

export namespace StreamAggregatesSpotExchangeRateResponseV1 {
  export type AsObject = {
    aggregate: string,
    code: string,
    price: string,
    sequenceId: string,
    sourcesMap: Array<[string, sdk_stream_aggregates_spot_exchange_rate_v1_source_pb.Source.AsObject]>,
    timestamp?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    uid: string,
  }
}


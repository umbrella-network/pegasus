// package: kaikosdk
// file: sdk/stream/aggregates_direct_exchange_rate_v1/response.proto

import * as jspb from "google-protobuf";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";
import * as sdk_core_source_data_pb from "../../../sdk/core/source_data_pb";

export class StreamAggregatesDirectExchangeRateResponseV1 extends jspb.Message {
  getAggregate(): string;
  setAggregate(value: string): void;

  getCode(): string;
  setCode(value: string): void;

  getPrice(): string;
  setPrice(value: string): void;

  getSequenceId(): string;
  setSequenceId(value: string): void;

  clearSourcesList(): void;
  getSourcesList(): Array<sdk_core_source_data_pb.SourceData>;
  setSourcesList(value: Array<sdk_core_source_data_pb.SourceData>): void;
  addSources(value?: sdk_core_source_data_pb.SourceData, index?: number): sdk_core_source_data_pb.SourceData;

  hasTimestamp(): boolean;
  clearTimestamp(): void;
  getTimestamp(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setTimestamp(value?: google_protobuf_timestamp_pb.Timestamp): void;

  getUid(): string;
  setUid(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StreamAggregatesDirectExchangeRateResponseV1.AsObject;
  static toObject(includeInstance: boolean, msg: StreamAggregatesDirectExchangeRateResponseV1): StreamAggregatesDirectExchangeRateResponseV1.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: StreamAggregatesDirectExchangeRateResponseV1, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StreamAggregatesDirectExchangeRateResponseV1;
  static deserializeBinaryFromReader(message: StreamAggregatesDirectExchangeRateResponseV1, reader: jspb.BinaryReader): StreamAggregatesDirectExchangeRateResponseV1;
}

export namespace StreamAggregatesDirectExchangeRateResponseV1 {
  export type AsObject = {
    aggregate: string,
    code: string,
    price: string,
    sequenceId: string,
    sourcesList: Array<sdk_core_source_data_pb.SourceData.AsObject>,
    timestamp?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    uid: string,
  }
}


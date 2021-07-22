// package: kaikosdk
// file: sdk/stream/aggregates_vwap_v1/response.proto

import * as jspb from "google-protobuf";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";

export class StreamAggregatesVWAPResponseV1 extends jspb.Message {
  getAggregate(): string;
  setAggregate(value: string): void;

  getClass(): string;
  setClass(value: string): void;

  getCode(): string;
  setCode(value: string): void;

  getExchange(): string;
  setExchange(value: string): void;

  getSequenceId(): string;
  setSequenceId(value: string): void;

  getPrice(): number;
  setPrice(value: number): void;

  hasTsEvent(): boolean;
  clearTsEvent(): void;
  getTsEvent(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setTsEvent(value?: google_protobuf_timestamp_pb.Timestamp): void;

  getUid(): string;
  setUid(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StreamAggregatesVWAPResponseV1.AsObject;
  static toObject(includeInstance: boolean, msg: StreamAggregatesVWAPResponseV1): StreamAggregatesVWAPResponseV1.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: StreamAggregatesVWAPResponseV1, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StreamAggregatesVWAPResponseV1;
  static deserializeBinaryFromReader(message: StreamAggregatesVWAPResponseV1, reader: jspb.BinaryReader): StreamAggregatesVWAPResponseV1;
}

export namespace StreamAggregatesVWAPResponseV1 {
  export type AsObject = {
    aggregate: string,
    pb_class: string,
    code: string,
    exchange: string,
    sequenceId: string,
    price: number,
    tsEvent?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    uid: string,
  }
}


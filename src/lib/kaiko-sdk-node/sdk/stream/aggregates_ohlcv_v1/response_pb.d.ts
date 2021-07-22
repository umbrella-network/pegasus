// package: kaikosdk
// file: sdk/stream/aggregates_ohlcv_v1/response.proto

import * as jspb from "google-protobuf";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";

export class StreamAggregatesOHLCVResponseV1 extends jspb.Message {
  getAggregate(): string;
  setAggregate(value: string): void;

  getClass(): string;
  setClass(value: string): void;

  getClose(): string;
  setClose(value: string): void;

  getExchange(): string;
  setExchange(value: string): void;

  getHigh(): string;
  setHigh(value: string): void;

  getLow(): string;
  setLow(value: string): void;

  getOpen(): string;
  setOpen(value: string): void;

  getSequenceId(): string;
  setSequenceId(value: string): void;

  getCode(): string;
  setCode(value: string): void;

  hasTimestamp(): boolean;
  clearTimestamp(): void;
  getTimestamp(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setTimestamp(value?: google_protobuf_timestamp_pb.Timestamp): void;

  getUid(): string;
  setUid(value: string): void;

  getVolume(): string;
  setVolume(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StreamAggregatesOHLCVResponseV1.AsObject;
  static toObject(includeInstance: boolean, msg: StreamAggregatesOHLCVResponseV1): StreamAggregatesOHLCVResponseV1.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: StreamAggregatesOHLCVResponseV1, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StreamAggregatesOHLCVResponseV1;
  static deserializeBinaryFromReader(message: StreamAggregatesOHLCVResponseV1, reader: jspb.BinaryReader): StreamAggregatesOHLCVResponseV1;
}

export namespace StreamAggregatesOHLCVResponseV1 {
  export type AsObject = {
    aggregate: string,
    pb_class: string,
    close: string,
    exchange: string,
    high: string,
    low: string,
    open: string,
    sequenceId: string,
    code: string,
    timestamp?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    uid: string,
    volume: string,
  }
}


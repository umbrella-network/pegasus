// package: kaikosdk
// file: sdk/stream/trades_v1/response.proto

import * as jspb from "google-protobuf";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";
import * as sdk_core_wrappers_pb from "../../../sdk/core/wrappers_pb";

export class StreamTradesResponseV1 extends jspb.Message {
  getAdditionalPropertiesMap(): jspb.Map<string, string>;
  clearAdditionalPropertiesMap(): void;
  getAmount(): number;
  setAmount(value: number): void;

  getClass(): string;
  setClass(value: string): void;

  getCode(): string;
  setCode(value: string): void;

  getExchange(): string;
  setExchange(value: string): void;

  getSequenceId(): string;
  setSequenceId(value: string): void;

  getId(): string;
  setId(value: string): void;

  getPrice(): number;
  setPrice(value: number): void;

  getSide(): StreamTradesResponseV1.TradeSideMap[keyof StreamTradesResponseV1.TradeSideMap];
  setSide(value: StreamTradesResponseV1.TradeSideMap[keyof StreamTradesResponseV1.TradeSideMap]): void;

  hasTsExchange(): boolean;
  clearTsExchange(): void;
  getTsExchange(): sdk_core_wrappers_pb.TimestampValue | undefined;
  setTsExchange(value?: sdk_core_wrappers_pb.TimestampValue): void;

  hasTsCollection(): boolean;
  clearTsCollection(): void;
  getTsCollection(): sdk_core_wrappers_pb.TimestampValue | undefined;
  setTsCollection(value?: sdk_core_wrappers_pb.TimestampValue): void;

  hasTsEvent(): boolean;
  clearTsEvent(): void;
  getTsEvent(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setTsEvent(value?: google_protobuf_timestamp_pb.Timestamp): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StreamTradesResponseV1.AsObject;
  static toObject(includeInstance: boolean, msg: StreamTradesResponseV1): StreamTradesResponseV1.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: StreamTradesResponseV1, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StreamTradesResponseV1;
  static deserializeBinaryFromReader(message: StreamTradesResponseV1, reader: jspb.BinaryReader): StreamTradesResponseV1;
}

export namespace StreamTradesResponseV1 {
  export type AsObject = {
    additionalPropertiesMap: Array<[string, string]>,
    amount: number,
    pb_class: string,
    code: string,
    exchange: string,
    sequenceId: string,
    id: string,
    price: number,
    side: StreamTradesResponseV1.TradeSideMap[keyof StreamTradesResponseV1.TradeSideMap],
    tsExchange?: sdk_core_wrappers_pb.TimestampValue.AsObject,
    tsCollection?: sdk_core_wrappers_pb.TimestampValue.AsObject,
    tsEvent?: google_protobuf_timestamp_pb.Timestamp.AsObject,
  }

  export interface TradeSideMap {
    UNKNOWN: 0;
    BUY: 1;
    SELL: 2;
  }

  export const TradeSide: TradeSideMap;
}


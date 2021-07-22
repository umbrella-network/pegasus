// package: kaikosdk
// file: sdk/stream/market_update_v1/response.proto

import * as jspb from "google-protobuf";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";
import * as sdk_core_wrappers_pb from "../../../sdk/core/wrappers_pb";
import * as sdk_stream_market_update_v1_commodity_pb from "../../../sdk/stream/market_update_v1/commodity_pb";

export class StreamMarketUpdateResponseV1 extends jspb.Message {
  getCommodity(): sdk_stream_market_update_v1_commodity_pb.StreamMarketUpdateCommodityMap[keyof sdk_stream_market_update_v1_commodity_pb.StreamMarketUpdateCommodityMap];
  setCommodity(value: sdk_stream_market_update_v1_commodity_pb.StreamMarketUpdateCommodityMap[keyof sdk_stream_market_update_v1_commodity_pb.StreamMarketUpdateCommodityMap]): void;

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

  getUpdateType(): StreamMarketUpdateResponseV1.StreamMarketUpdateTypeMap[keyof StreamMarketUpdateResponseV1.StreamMarketUpdateTypeMap];
  setUpdateType(value: StreamMarketUpdateResponseV1.StreamMarketUpdateTypeMap[keyof StreamMarketUpdateResponseV1.StreamMarketUpdateTypeMap]): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StreamMarketUpdateResponseV1.AsObject;
  static toObject(includeInstance: boolean, msg: StreamMarketUpdateResponseV1): StreamMarketUpdateResponseV1.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: StreamMarketUpdateResponseV1, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StreamMarketUpdateResponseV1;
  static deserializeBinaryFromReader(message: StreamMarketUpdateResponseV1, reader: jspb.BinaryReader): StreamMarketUpdateResponseV1;
}

export namespace StreamMarketUpdateResponseV1 {
  export type AsObject = {
    commodity: sdk_stream_market_update_v1_commodity_pb.StreamMarketUpdateCommodityMap[keyof sdk_stream_market_update_v1_commodity_pb.StreamMarketUpdateCommodityMap],
    amount: number,
    pb_class: string,
    code: string,
    exchange: string,
    sequenceId: string,
    id: string,
    price: number,
    tsExchange?: sdk_core_wrappers_pb.TimestampValue.AsObject,
    tsCollection?: sdk_core_wrappers_pb.TimestampValue.AsObject,
    tsEvent?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    updateType: StreamMarketUpdateResponseV1.StreamMarketUpdateTypeMap[keyof StreamMarketUpdateResponseV1.StreamMarketUpdateTypeMap],
  }

  export interface StreamMarketUpdateTypeMap {
    UNKNOWN: 0;
    TRADE_BUY: 1;
    TRADE_SELL: 2;
    BEST_ASK: 3;
    BEST_BID: 4;
    UPDATED_ASK: 5;
    UPDATED_BID: 6;
  }

  export const StreamMarketUpdateType: StreamMarketUpdateTypeMap;
}


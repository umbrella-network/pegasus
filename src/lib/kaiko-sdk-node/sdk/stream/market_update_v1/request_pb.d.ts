// package: kaikosdk
// file: sdk/stream/market_update_v1/request.proto

import * as jspb from "google-protobuf";
import * as sdk_core_instrument_criteria_pb from "../../../sdk/core/instrument_criteria_pb";
import * as sdk_stream_market_update_v1_commodity_pb from "../../../sdk/stream/market_update_v1/commodity_pb";

export class StreamMarketUpdateRequestV1 extends jspb.Message {
  hasInstrumentCriteria(): boolean;
  clearInstrumentCriteria(): void;
  getInstrumentCriteria(): sdk_core_instrument_criteria_pb.InstrumentCriteria | undefined;
  setInstrumentCriteria(value?: sdk_core_instrument_criteria_pb.InstrumentCriteria): void;

  clearCommoditiesList(): void;
  getCommoditiesList(): Array<sdk_stream_market_update_v1_commodity_pb.StreamMarketUpdateCommodityMap[keyof sdk_stream_market_update_v1_commodity_pb.StreamMarketUpdateCommodityMap]>;
  setCommoditiesList(value: Array<sdk_stream_market_update_v1_commodity_pb.StreamMarketUpdateCommodityMap[keyof sdk_stream_market_update_v1_commodity_pb.StreamMarketUpdateCommodityMap]>): void;
  addCommodities(value: sdk_stream_market_update_v1_commodity_pb.StreamMarketUpdateCommodityMap[keyof sdk_stream_market_update_v1_commodity_pb.StreamMarketUpdateCommodityMap], index?: number): sdk_stream_market_update_v1_commodity_pb.StreamMarketUpdateCommodityMap[keyof sdk_stream_market_update_v1_commodity_pb.StreamMarketUpdateCommodityMap];

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StreamMarketUpdateRequestV1.AsObject;
  static toObject(includeInstance: boolean, msg: StreamMarketUpdateRequestV1): StreamMarketUpdateRequestV1.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: StreamMarketUpdateRequestV1, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StreamMarketUpdateRequestV1;
  static deserializeBinaryFromReader(message: StreamMarketUpdateRequestV1, reader: jspb.BinaryReader): StreamMarketUpdateRequestV1;
}

export namespace StreamMarketUpdateRequestV1 {
  export type AsObject = {
    instrumentCriteria?: sdk_core_instrument_criteria_pb.InstrumentCriteria.AsObject,
    commoditiesList: Array<sdk_stream_market_update_v1_commodity_pb.StreamMarketUpdateCommodityMap[keyof sdk_stream_market_update_v1_commodity_pb.StreamMarketUpdateCommodityMap]>,
  }
}


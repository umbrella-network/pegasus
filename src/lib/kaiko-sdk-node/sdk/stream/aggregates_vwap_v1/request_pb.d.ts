// package: kaikosdk
// file: sdk/stream/aggregates_vwap_v1/request.proto

import * as jspb from "google-protobuf";
import * as sdk_core_instrument_criteria_pb from "../../../sdk/core/instrument_criteria_pb";

export class StreamAggregatesVWAPRequestV1 extends jspb.Message {
  hasInstrumentCriteria(): boolean;
  clearInstrumentCriteria(): void;
  getInstrumentCriteria(): sdk_core_instrument_criteria_pb.InstrumentCriteria | undefined;
  setInstrumentCriteria(value?: sdk_core_instrument_criteria_pb.InstrumentCriteria): void;

  getAggregate(): string;
  setAggregate(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StreamAggregatesVWAPRequestV1.AsObject;
  static toObject(includeInstance: boolean, msg: StreamAggregatesVWAPRequestV1): StreamAggregatesVWAPRequestV1.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: StreamAggregatesVWAPRequestV1, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StreamAggregatesVWAPRequestV1;
  static deserializeBinaryFromReader(message: StreamAggregatesVWAPRequestV1, reader: jspb.BinaryReader): StreamAggregatesVWAPRequestV1;
}

export namespace StreamAggregatesVWAPRequestV1 {
  export type AsObject = {
    instrumentCriteria?: sdk_core_instrument_criteria_pb.InstrumentCriteria.AsObject,
    aggregate: string,
  }
}


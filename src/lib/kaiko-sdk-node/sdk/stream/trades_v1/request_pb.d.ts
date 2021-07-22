// package: kaikosdk
// file: sdk/stream/trades_v1/request.proto

import * as jspb from "google-protobuf";
import * as sdk_core_instrument_criteria_pb from "../../../sdk/core/instrument_criteria_pb";

export class StreamTradesRequestV1 extends jspb.Message {
  hasInstrumentCriteria(): boolean;
  clearInstrumentCriteria(): void;
  getInstrumentCriteria(): sdk_core_instrument_criteria_pb.InstrumentCriteria | undefined;
  setInstrumentCriteria(value?: sdk_core_instrument_criteria_pb.InstrumentCriteria): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StreamTradesRequestV1.AsObject;
  static toObject(includeInstance: boolean, msg: StreamTradesRequestV1): StreamTradesRequestV1.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: StreamTradesRequestV1, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StreamTradesRequestV1;
  static deserializeBinaryFromReader(message: StreamTradesRequestV1, reader: jspb.BinaryReader): StreamTradesRequestV1;
}

export namespace StreamTradesRequestV1 {
  export type AsObject = {
    instrumentCriteria?: sdk_core_instrument_criteria_pb.InstrumentCriteria.AsObject,
  }
}


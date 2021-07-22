// package: kaikosdk
// file: sdk/core/instrument_criteria.proto

import * as jspb from "google-protobuf";

export class InstrumentCriteria extends jspb.Message {
  getExchange(): string;
  setExchange(value: string): void;

  getInstrumentClass(): string;
  setInstrumentClass(value: string): void;

  getCode(): string;
  setCode(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): InstrumentCriteria.AsObject;
  static toObject(includeInstance: boolean, msg: InstrumentCriteria): InstrumentCriteria.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: InstrumentCriteria, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): InstrumentCriteria;
  static deserializeBinaryFromReader(message: InstrumentCriteria, reader: jspb.BinaryReader): InstrumentCriteria;
}

export namespace InstrumentCriteria {
  export type AsObject = {
    exchange: string,
    instrumentClass: string,
    code: string,
  }
}


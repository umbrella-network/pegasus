// package: kaikosdk
// file: sdk/stream/aggregates_spot_exchange_rate_v1/source_data.proto

import * as jspb from "google-protobuf";

export class SourceData extends jspb.Message {
  getExchangeCode(): string;
  setExchangeCode(value: string): void;

  getCount(): number;
  setCount(value: number): void;

  getPrice(): string;
  setPrice(value: string): void;

  getVolume(): string;
  setVolume(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SourceData.AsObject;
  static toObject(includeInstance: boolean, msg: SourceData): SourceData.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SourceData, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SourceData;
  static deserializeBinaryFromReader(message: SourceData, reader: jspb.BinaryReader): SourceData;
}

export namespace SourceData {
  export type AsObject = {
    exchangeCode: string,
    count: number,
    price: string,
    volume: string,
  }
}


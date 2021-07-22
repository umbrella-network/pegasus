// package: kaikosdk
// file: sdk/core/wrappers.proto

import * as jspb from "google-protobuf";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";

export class TimestampValue extends jspb.Message {
  hasValue(): boolean;
  clearValue(): void;
  getValue(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setValue(value?: google_protobuf_timestamp_pb.Timestamp): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TimestampValue.AsObject;
  static toObject(includeInstance: boolean, msg: TimestampValue): TimestampValue.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: TimestampValue, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TimestampValue;
  static deserializeBinaryFromReader(message: TimestampValue, reader: jspb.BinaryReader): TimestampValue;
}

export namespace TimestampValue {
  export type AsObject = {
    value?: google_protobuf_timestamp_pb.Timestamp.AsObject,
  }
}


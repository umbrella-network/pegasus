// package: kaikosdk
// file: sdk/core/envelope.proto

import * as jspb from "google-protobuf";
import * as google_protobuf_struct_pb from "google-protobuf/google/protobuf/struct_pb";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";
import * as sdk_core_envelope_status_pb from "../../sdk/core/envelope_status_pb";

export class Envelope extends jspb.Message {
  hasAccess(): boolean;
  clearAccess(): void;
  getAccess(): google_protobuf_struct_pb.Struct | undefined;
  setAccess(value?: google_protobuf_struct_pb.Struct): void;

  getMessage(): string;
  setMessage(value: string): void;

  hasQuery(): boolean;
  clearQuery(): void;
  getQuery(): google_protobuf_struct_pb.Struct | undefined;
  setQuery(value?: google_protobuf_struct_pb.Struct): void;

  getStatus(): sdk_core_envelope_status_pb.EnvelopeStatusMap[keyof sdk_core_envelope_status_pb.EnvelopeStatusMap];
  setStatus(value: sdk_core_envelope_status_pb.EnvelopeStatusMap[keyof sdk_core_envelope_status_pb.EnvelopeStatusMap]): void;

  hasTime(): boolean;
  clearTime(): void;
  getTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setTime(value?: google_protobuf_timestamp_pb.Timestamp): void;

  getTimestamp(): string;
  setTimestamp(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Envelope.AsObject;
  static toObject(includeInstance: boolean, msg: Envelope): Envelope.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Envelope, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Envelope;
  static deserializeBinaryFromReader(message: Envelope, reader: jspb.BinaryReader): Envelope;
}

export namespace Envelope {
  export type AsObject = {
    access?: google_protobuf_struct_pb.Struct.AsObject,
    message: string,
    query?: google_protobuf_struct_pb.Struct.AsObject,
    status: sdk_core_envelope_status_pb.EnvelopeStatusMap[keyof sdk_core_envelope_status_pb.EnvelopeStatusMap],
    time?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    timestamp: string,
  }
}


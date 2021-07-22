// package: kaikosdk
// file: sdk/core/response.proto

import * as jspb from "google-protobuf";
import * as sdk_core_envelope_pb from "../../sdk/core/envelope_pb";

export class Response extends jspb.Message {
  hasEnvelope(): boolean;
  clearEnvelope(): void;
  getEnvelope(): sdk_core_envelope_pb.Envelope | undefined;
  setEnvelope(value?: sdk_core_envelope_pb.Envelope): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Response.AsObject;
  static toObject(includeInstance: boolean, msg: Response): Response.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Response, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Response;
  static deserializeBinaryFromReader(message: Response, reader: jspb.BinaryReader): Response;
}

export namespace Response {
  export type AsObject = {
    envelope?: sdk_core_envelope_pb.Envelope.AsObject,
  }
}


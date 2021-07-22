// package: kaikosdk
// file: sdk/stream/aggregates_spot_exchange_rate_v1/source.proto

import * as jspb from "google-protobuf";
import * as sdk_stream_aggregates_spot_exchange_rate_v1_source_data_pb from "../../../sdk/stream/aggregates_spot_exchange_rate_v1/source_data_pb";

export class Source extends jspb.Message {
  clearDataList(): void;
  getDataList(): Array<sdk_stream_aggregates_spot_exchange_rate_v1_source_data_pb.SourceData>;
  setDataList(value: Array<sdk_stream_aggregates_spot_exchange_rate_v1_source_data_pb.SourceData>): void;
  addData(value?: sdk_stream_aggregates_spot_exchange_rate_v1_source_data_pb.SourceData, index?: number): sdk_stream_aggregates_spot_exchange_rate_v1_source_data_pb.SourceData;

  getPrice(): string;
  setPrice(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Source.AsObject;
  static toObject(includeInstance: boolean, msg: Source): Source.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Source, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Source;
  static deserializeBinaryFromReader(message: Source, reader: jspb.BinaryReader): Source;
}

export namespace Source {
  export type AsObject = {
    dataList: Array<sdk_stream_aggregates_spot_exchange_rate_v1_source_data_pb.SourceData.AsObject>,
    price: string,
  }
}


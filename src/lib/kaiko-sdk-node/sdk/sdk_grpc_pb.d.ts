// GENERATED CODE -- DO NOT EDIT!

// package: kaikosdk
// file: sdk/sdk.proto

import * as sdk_sdk_pb from "../sdk/sdk_pb";
import * as sdk_stream_aggregates_ohlcv_v1_request_pb from "../sdk/stream/aggregates_ohlcv_v1/request_pb";
import * as sdk_stream_aggregates_ohlcv_v1_response_pb from "../sdk/stream/aggregates_ohlcv_v1/response_pb";
import * as sdk_stream_aggregates_vwap_v1_request_pb from "../sdk/stream/aggregates_vwap_v1/request_pb";
import * as sdk_stream_aggregates_vwap_v1_response_pb from "../sdk/stream/aggregates_vwap_v1/response_pb";
import * as sdk_stream_aggregates_direct_exchange_rate_v1_request_pb from "../sdk/stream/aggregates_direct_exchange_rate_v1/request_pb";
import * as sdk_stream_aggregates_direct_exchange_rate_v1_response_pb from "../sdk/stream/aggregates_direct_exchange_rate_v1/response_pb";
import * as sdk_stream_aggregates_spot_exchange_rate_v1_request_pb from "../sdk/stream/aggregates_spot_exchange_rate_v1/request_pb";
import * as sdk_stream_aggregates_spot_exchange_rate_v1_response_pb from "../sdk/stream/aggregates_spot_exchange_rate_v1/response_pb";
import * as sdk_stream_market_update_v1_request_pb from "../sdk/stream/market_update_v1/request_pb";
import * as sdk_stream_market_update_v1_response_pb from "../sdk/stream/market_update_v1/response_pb";
import * as sdk_stream_trades_v1_request_pb from "../sdk/stream/trades_v1/request_pb";
import * as sdk_stream_trades_v1_response_pb from "../sdk/stream/trades_v1/response_pb";
import * as grpc from "@grpc/grpc-js";

interface IStreamAggregatesOHLCVServiceV1Service extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
  subscribe: grpc.MethodDefinition<sdk_stream_aggregates_ohlcv_v1_request_pb.StreamAggregatesOHLCVRequestV1, sdk_stream_aggregates_ohlcv_v1_response_pb.StreamAggregatesOHLCVResponseV1>;
}

export const StreamAggregatesOHLCVServiceV1Service: IStreamAggregatesOHLCVServiceV1Service;

export interface IStreamAggregatesOHLCVServiceV1Server extends grpc.UntypedServiceImplementation {
  subscribe: grpc.handleServerStreamingCall<sdk_stream_aggregates_ohlcv_v1_request_pb.StreamAggregatesOHLCVRequestV1, sdk_stream_aggregates_ohlcv_v1_response_pb.StreamAggregatesOHLCVResponseV1>;
}

export class StreamAggregatesOHLCVServiceV1Client extends grpc.Client {
  constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
  subscribe(argument: sdk_stream_aggregates_ohlcv_v1_request_pb.StreamAggregatesOHLCVRequestV1, metadataOrOptions?: grpc.Metadata | grpc.CallOptions | null): grpc.ClientReadableStream<sdk_stream_aggregates_ohlcv_v1_response_pb.StreamAggregatesOHLCVResponseV1>;
  subscribe(argument: sdk_stream_aggregates_ohlcv_v1_request_pb.StreamAggregatesOHLCVRequestV1, metadata?: grpc.Metadata | null, options?: grpc.CallOptions | null): grpc.ClientReadableStream<sdk_stream_aggregates_ohlcv_v1_response_pb.StreamAggregatesOHLCVResponseV1>;
}

interface IStreamAggregatesSpotExchangeRateServiceV1Service extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
  subscribe: grpc.MethodDefinition<sdk_stream_aggregates_spot_exchange_rate_v1_request_pb.StreamAggregatesSpotExchangeRateRequestV1, sdk_stream_aggregates_spot_exchange_rate_v1_response_pb.StreamAggregatesSpotExchangeRateResponseV1>;
}

export const StreamAggregatesSpotExchangeRateServiceV1Service: IStreamAggregatesSpotExchangeRateServiceV1Service;

export interface IStreamAggregatesSpotExchangeRateServiceV1Server extends grpc.UntypedServiceImplementation {
  subscribe: grpc.handleServerStreamingCall<sdk_stream_aggregates_spot_exchange_rate_v1_request_pb.StreamAggregatesSpotExchangeRateRequestV1, sdk_stream_aggregates_spot_exchange_rate_v1_response_pb.StreamAggregatesSpotExchangeRateResponseV1>;
}

export class StreamAggregatesSpotExchangeRateServiceV1Client extends grpc.Client {
  constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
  subscribe(argument: sdk_stream_aggregates_spot_exchange_rate_v1_request_pb.StreamAggregatesSpotExchangeRateRequestV1, metadataOrOptions?: grpc.Metadata | grpc.CallOptions | null): grpc.ClientReadableStream<sdk_stream_aggregates_spot_exchange_rate_v1_response_pb.StreamAggregatesSpotExchangeRateResponseV1>;
  subscribe(argument: sdk_stream_aggregates_spot_exchange_rate_v1_request_pb.StreamAggregatesSpotExchangeRateRequestV1, metadata?: grpc.Metadata | null, options?: grpc.CallOptions | null): grpc.ClientReadableStream<sdk_stream_aggregates_spot_exchange_rate_v1_response_pb.StreamAggregatesSpotExchangeRateResponseV1>;
}

interface IStreamAggregatesDirectExchangeRateServiceV1Service extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
  subscribe: grpc.MethodDefinition<sdk_stream_aggregates_direct_exchange_rate_v1_request_pb.StreamAggregatesDirectExchangeRateRequestV1, sdk_stream_aggregates_direct_exchange_rate_v1_response_pb.StreamAggregatesDirectExchangeRateResponseV1>;
}

export const StreamAggregatesDirectExchangeRateServiceV1Service: IStreamAggregatesDirectExchangeRateServiceV1Service;

export interface IStreamAggregatesDirectExchangeRateServiceV1Server extends grpc.UntypedServiceImplementation {
  subscribe: grpc.handleServerStreamingCall<sdk_stream_aggregates_direct_exchange_rate_v1_request_pb.StreamAggregatesDirectExchangeRateRequestV1, sdk_stream_aggregates_direct_exchange_rate_v1_response_pb.StreamAggregatesDirectExchangeRateResponseV1>;
}

export class StreamAggregatesDirectExchangeRateServiceV1Client extends grpc.Client {
  constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
  subscribe(argument: sdk_stream_aggregates_direct_exchange_rate_v1_request_pb.StreamAggregatesDirectExchangeRateRequestV1, metadataOrOptions?: grpc.Metadata | grpc.CallOptions | null): grpc.ClientReadableStream<sdk_stream_aggregates_direct_exchange_rate_v1_response_pb.StreamAggregatesDirectExchangeRateResponseV1>;
  subscribe(argument: sdk_stream_aggregates_direct_exchange_rate_v1_request_pb.StreamAggregatesDirectExchangeRateRequestV1, metadata?: grpc.Metadata | null, options?: grpc.CallOptions | null): grpc.ClientReadableStream<sdk_stream_aggregates_direct_exchange_rate_v1_response_pb.StreamAggregatesDirectExchangeRateResponseV1>;
}

interface IStreamTradesServiceV1Service extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
  subscribe: grpc.MethodDefinition<sdk_stream_trades_v1_request_pb.StreamTradesRequestV1, sdk_stream_trades_v1_response_pb.StreamTradesResponseV1>;
}

export const StreamTradesServiceV1Service: IStreamTradesServiceV1Service;

export interface IStreamTradesServiceV1Server extends grpc.UntypedServiceImplementation {
  subscribe: grpc.handleServerStreamingCall<sdk_stream_trades_v1_request_pb.StreamTradesRequestV1, sdk_stream_trades_v1_response_pb.StreamTradesResponseV1>;
}

export class StreamTradesServiceV1Client extends grpc.Client {
  constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
  subscribe(argument: sdk_stream_trades_v1_request_pb.StreamTradesRequestV1, metadataOrOptions?: grpc.Metadata | grpc.CallOptions | null): grpc.ClientReadableStream<sdk_stream_trades_v1_response_pb.StreamTradesResponseV1>;
  subscribe(argument: sdk_stream_trades_v1_request_pb.StreamTradesRequestV1, metadata?: grpc.Metadata | null, options?: grpc.CallOptions | null): grpc.ClientReadableStream<sdk_stream_trades_v1_response_pb.StreamTradesResponseV1>;
}

interface IStreamAggregatesVWAPServiceV1Service extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
  subscribe: grpc.MethodDefinition<sdk_stream_aggregates_vwap_v1_request_pb.StreamAggregatesVWAPRequestV1, sdk_stream_aggregates_vwap_v1_response_pb.StreamAggregatesVWAPResponseV1>;
}

export const StreamAggregatesVWAPServiceV1Service: IStreamAggregatesVWAPServiceV1Service;

export interface IStreamAggregatesVWAPServiceV1Server extends grpc.UntypedServiceImplementation {
  subscribe: grpc.handleServerStreamingCall<sdk_stream_aggregates_vwap_v1_request_pb.StreamAggregatesVWAPRequestV1, sdk_stream_aggregates_vwap_v1_response_pb.StreamAggregatesVWAPResponseV1>;
}

export class StreamAggregatesVWAPServiceV1Client extends grpc.Client {
  constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
  subscribe(argument: sdk_stream_aggregates_vwap_v1_request_pb.StreamAggregatesVWAPRequestV1, metadataOrOptions?: grpc.Metadata | grpc.CallOptions | null): grpc.ClientReadableStream<sdk_stream_aggregates_vwap_v1_response_pb.StreamAggregatesVWAPResponseV1>;
  subscribe(argument: sdk_stream_aggregates_vwap_v1_request_pb.StreamAggregatesVWAPRequestV1, metadata?: grpc.Metadata | null, options?: grpc.CallOptions | null): grpc.ClientReadableStream<sdk_stream_aggregates_vwap_v1_response_pb.StreamAggregatesVWAPResponseV1>;
}

interface IStreamMarketUpdateServiceV1Service extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
  subscribe: grpc.MethodDefinition<sdk_stream_market_update_v1_request_pb.StreamMarketUpdateRequestV1, sdk_stream_market_update_v1_response_pb.StreamMarketUpdateResponseV1>;
}

export const StreamMarketUpdateServiceV1Service: IStreamMarketUpdateServiceV1Service;

export interface IStreamMarketUpdateServiceV1Server extends grpc.UntypedServiceImplementation {
  subscribe: grpc.handleServerStreamingCall<sdk_stream_market_update_v1_request_pb.StreamMarketUpdateRequestV1, sdk_stream_market_update_v1_response_pb.StreamMarketUpdateResponseV1>;
}

export class StreamMarketUpdateServiceV1Client extends grpc.Client {
  constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
  subscribe(argument: sdk_stream_market_update_v1_request_pb.StreamMarketUpdateRequestV1, metadataOrOptions?: grpc.Metadata | grpc.CallOptions | null): grpc.ClientReadableStream<sdk_stream_market_update_v1_response_pb.StreamMarketUpdateResponseV1>;
  subscribe(argument: sdk_stream_market_update_v1_request_pb.StreamMarketUpdateRequestV1, metadata?: grpc.Metadata | null, options?: grpc.CallOptions | null): grpc.ClientReadableStream<sdk_stream_market_update_v1_response_pb.StreamMarketUpdateResponseV1>;
}

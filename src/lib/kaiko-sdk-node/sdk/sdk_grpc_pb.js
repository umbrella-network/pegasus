// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var sdk_stream_aggregates_ohlcv_v1_request_pb = require('../sdk/stream/aggregates_ohlcv_v1/request_pb.js');
var sdk_stream_aggregates_ohlcv_v1_response_pb = require('../sdk/stream/aggregates_ohlcv_v1/response_pb.js');
var sdk_stream_aggregates_vwap_v1_request_pb = require('../sdk/stream/aggregates_vwap_v1/request_pb.js');
var sdk_stream_aggregates_vwap_v1_response_pb = require('../sdk/stream/aggregates_vwap_v1/response_pb.js');
var sdk_stream_aggregates_spot_exchange_rate_v1_request_pb = require('../sdk/stream/aggregates_spot_exchange_rate_v1/request_pb.js');
var sdk_stream_aggregates_spot_exchange_rate_v1_response_pb = require('../sdk/stream/aggregates_spot_exchange_rate_v1/response_pb.js');
var sdk_stream_market_update_v1_request_pb = require('../sdk/stream/market_update_v1/request_pb.js');
var sdk_stream_market_update_v1_response_pb = require('../sdk/stream/market_update_v1/response_pb.js');
var sdk_stream_trades_v1_request_pb = require('../sdk/stream/trades_v1/request_pb.js');
var sdk_stream_trades_v1_response_pb = require('../sdk/stream/trades_v1/response_pb.js');

function serialize_kaikosdk_StreamAggregatesOHLCVRequestV1(arg) {
  if (!(arg instanceof sdk_stream_aggregates_ohlcv_v1_request_pb.StreamAggregatesOHLCVRequestV1)) {
    throw new Error('Expected argument of type kaikosdk.StreamAggregatesOHLCVRequestV1');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_kaikosdk_StreamAggregatesOHLCVRequestV1(buffer_arg) {
  return sdk_stream_aggregates_ohlcv_v1_request_pb.StreamAggregatesOHLCVRequestV1.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_kaikosdk_StreamAggregatesOHLCVResponseV1(arg) {
  if (!(arg instanceof sdk_stream_aggregates_ohlcv_v1_response_pb.StreamAggregatesOHLCVResponseV1)) {
    throw new Error('Expected argument of type kaikosdk.StreamAggregatesOHLCVResponseV1');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_kaikosdk_StreamAggregatesOHLCVResponseV1(buffer_arg) {
  return sdk_stream_aggregates_ohlcv_v1_response_pb.StreamAggregatesOHLCVResponseV1.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_kaikosdk_StreamAggregatesSpotExchangeRateRequestV1(arg) {
  if (!(arg instanceof sdk_stream_aggregates_spot_exchange_rate_v1_request_pb.StreamAggregatesSpotExchangeRateRequestV1)) {
    throw new Error('Expected argument of type kaikosdk.StreamAggregatesSpotExchangeRateRequestV1');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_kaikosdk_StreamAggregatesSpotExchangeRateRequestV1(buffer_arg) {
  return sdk_stream_aggregates_spot_exchange_rate_v1_request_pb.StreamAggregatesSpotExchangeRateRequestV1.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_kaikosdk_StreamAggregatesSpotExchangeRateResponseV1(arg) {
  if (!(arg instanceof sdk_stream_aggregates_spot_exchange_rate_v1_response_pb.StreamAggregatesSpotExchangeRateResponseV1)) {
    throw new Error('Expected argument of type kaikosdk.StreamAggregatesSpotExchangeRateResponseV1');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_kaikosdk_StreamAggregatesSpotExchangeRateResponseV1(buffer_arg) {
  return sdk_stream_aggregates_spot_exchange_rate_v1_response_pb.StreamAggregatesSpotExchangeRateResponseV1.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_kaikosdk_StreamAggregatesVWAPRequestV1(arg) {
  if (!(arg instanceof sdk_stream_aggregates_vwap_v1_request_pb.StreamAggregatesVWAPRequestV1)) {
    throw new Error('Expected argument of type kaikosdk.StreamAggregatesVWAPRequestV1');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_kaikosdk_StreamAggregatesVWAPRequestV1(buffer_arg) {
  return sdk_stream_aggregates_vwap_v1_request_pb.StreamAggregatesVWAPRequestV1.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_kaikosdk_StreamAggregatesVWAPResponseV1(arg) {
  if (!(arg instanceof sdk_stream_aggregates_vwap_v1_response_pb.StreamAggregatesVWAPResponseV1)) {
    throw new Error('Expected argument of type kaikosdk.StreamAggregatesVWAPResponseV1');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_kaikosdk_StreamAggregatesVWAPResponseV1(buffer_arg) {
  return sdk_stream_aggregates_vwap_v1_response_pb.StreamAggregatesVWAPResponseV1.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_kaikosdk_StreamMarketUpdateRequestV1(arg) {
  if (!(arg instanceof sdk_stream_market_update_v1_request_pb.StreamMarketUpdateRequestV1)) {
    throw new Error('Expected argument of type kaikosdk.StreamMarketUpdateRequestV1');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_kaikosdk_StreamMarketUpdateRequestV1(buffer_arg) {
  return sdk_stream_market_update_v1_request_pb.StreamMarketUpdateRequestV1.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_kaikosdk_StreamMarketUpdateResponseV1(arg) {
  if (!(arg instanceof sdk_stream_market_update_v1_response_pb.StreamMarketUpdateResponseV1)) {
    throw new Error('Expected argument of type kaikosdk.StreamMarketUpdateResponseV1');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_kaikosdk_StreamMarketUpdateResponseV1(buffer_arg) {
  return sdk_stream_market_update_v1_response_pb.StreamMarketUpdateResponseV1.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_kaikosdk_StreamTradesRequestV1(arg) {
  if (!(arg instanceof sdk_stream_trades_v1_request_pb.StreamTradesRequestV1)) {
    throw new Error('Expected argument of type kaikosdk.StreamTradesRequestV1');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_kaikosdk_StreamTradesRequestV1(buffer_arg) {
  return sdk_stream_trades_v1_request_pb.StreamTradesRequestV1.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_kaikosdk_StreamTradesResponseV1(arg) {
  if (!(arg instanceof sdk_stream_trades_v1_response_pb.StreamTradesResponseV1)) {
    throw new Error('Expected argument of type kaikosdk.StreamTradesResponseV1');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_kaikosdk_StreamTradesResponseV1(buffer_arg) {
  return sdk_stream_trades_v1_response_pb.StreamTradesResponseV1.deserializeBinary(new Uint8Array(buffer_arg));
}


// Service for streaming OHLCV V1
var StreamAggregatesOHLCVServiceV1Service = exports.StreamAggregatesOHLCVServiceV1Service = {
  // Subscribe
subscribe: {
    path: '/kaikosdk.StreamAggregatesOHLCVServiceV1/Subscribe',
    requestStream: false,
    responseStream: true,
    requestType: sdk_stream_aggregates_ohlcv_v1_request_pb.StreamAggregatesOHLCVRequestV1,
    responseType: sdk_stream_aggregates_ohlcv_v1_response_pb.StreamAggregatesOHLCVResponseV1,
    requestSerialize: serialize_kaikosdk_StreamAggregatesOHLCVRequestV1,
    requestDeserialize: deserialize_kaikosdk_StreamAggregatesOHLCVRequestV1,
    responseSerialize: serialize_kaikosdk_StreamAggregatesOHLCVResponseV1,
    responseDeserialize: deserialize_kaikosdk_StreamAggregatesOHLCVResponseV1,
  },
};

exports.StreamAggregatesOHLCVServiceV1Client = grpc.makeGenericClientConstructor(StreamAggregatesOHLCVServiceV1Service);
// Service for streaming Spot exchange rate V1
var StreamAggregatesSpotExchangeRateServiceV1Service = exports.StreamAggregatesSpotExchangeRateServiceV1Service = {
  // Subscribe
subscribe: {
    path: '/kaikosdk.StreamAggregatesSpotExchangeRateServiceV1/Subscribe',
    requestStream: false,
    responseStream: true,
    requestType: sdk_stream_aggregates_spot_exchange_rate_v1_request_pb.StreamAggregatesSpotExchangeRateRequestV1,
    responseType: sdk_stream_aggregates_spot_exchange_rate_v1_response_pb.StreamAggregatesSpotExchangeRateResponseV1,
    requestSerialize: serialize_kaikosdk_StreamAggregatesSpotExchangeRateRequestV1,
    requestDeserialize: deserialize_kaikosdk_StreamAggregatesSpotExchangeRateRequestV1,
    responseSerialize: serialize_kaikosdk_StreamAggregatesSpotExchangeRateResponseV1,
    responseDeserialize: deserialize_kaikosdk_StreamAggregatesSpotExchangeRateResponseV1,
  },
};

exports.StreamAggregatesSpotExchangeRateServiceV1Client = grpc.makeGenericClientConstructor(StreamAggregatesSpotExchangeRateServiceV1Service);
// Service for streaming trades V1
var StreamTradesServiceV1Service = exports.StreamTradesServiceV1Service = {
  // Subscribe
subscribe: {
    path: '/kaikosdk.StreamTradesServiceV1/Subscribe',
    requestStream: false,
    responseStream: true,
    requestType: sdk_stream_trades_v1_request_pb.StreamTradesRequestV1,
    responseType: sdk_stream_trades_v1_response_pb.StreamTradesResponseV1,
    requestSerialize: serialize_kaikosdk_StreamTradesRequestV1,
    requestDeserialize: deserialize_kaikosdk_StreamTradesRequestV1,
    responseSerialize: serialize_kaikosdk_StreamTradesResponseV1,
    responseDeserialize: deserialize_kaikosdk_StreamTradesResponseV1,
  },
};

exports.StreamTradesServiceV1Client = grpc.makeGenericClientConstructor(StreamTradesServiceV1Service);
// Service for streaming VWAP V1
var StreamAggregatesVWAPServiceV1Service = exports.StreamAggregatesVWAPServiceV1Service = {
  // Subscribe
subscribe: {
    path: '/kaikosdk.StreamAggregatesVWAPServiceV1/Subscribe',
    requestStream: false,
    responseStream: true,
    requestType: sdk_stream_aggregates_vwap_v1_request_pb.StreamAggregatesVWAPRequestV1,
    responseType: sdk_stream_aggregates_vwap_v1_response_pb.StreamAggregatesVWAPResponseV1,
    requestSerialize: serialize_kaikosdk_StreamAggregatesVWAPRequestV1,
    requestDeserialize: deserialize_kaikosdk_StreamAggregatesVWAPRequestV1,
    responseSerialize: serialize_kaikosdk_StreamAggregatesVWAPResponseV1,
    responseDeserialize: deserialize_kaikosdk_StreamAggregatesVWAPResponseV1,
  },
};

exports.StreamAggregatesVWAPServiceV1Client = grpc.makeGenericClientConstructor(StreamAggregatesVWAPServiceV1Service);
// Service for streaming market update V1
var StreamMarketUpdateServiceV1Service = exports.StreamMarketUpdateServiceV1Service = {
  // Subscribe
subscribe: {
    path: '/kaikosdk.StreamMarketUpdateServiceV1/Subscribe',
    requestStream: false,
    responseStream: true,
    requestType: sdk_stream_market_update_v1_request_pb.StreamMarketUpdateRequestV1,
    responseType: sdk_stream_market_update_v1_response_pb.StreamMarketUpdateResponseV1,
    requestSerialize: serialize_kaikosdk_StreamMarketUpdateRequestV1,
    requestDeserialize: deserialize_kaikosdk_StreamMarketUpdateRequestV1,
    responseSerialize: serialize_kaikosdk_StreamMarketUpdateResponseV1,
    responseDeserialize: deserialize_kaikosdk_StreamMarketUpdateResponseV1,
  },
};

exports.StreamMarketUpdateServiceV1Client = grpc.makeGenericClientConstructor(StreamMarketUpdateServiceV1Service);

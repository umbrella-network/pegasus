// source: sdk/stream/aggregates_spot_exchange_rate_v1/response.proto
/**
 * @fileoverview
 * @enhanceable
 * @suppress {missingRequire} reports error on implicit type usages.
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!
/* eslint-disable */
// @ts-nocheck

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var google_protobuf_timestamp_pb = require('google-protobuf/google/protobuf/timestamp_pb.js');
goog.object.extend(proto, google_protobuf_timestamp_pb);
var sdk_stream_aggregates_spot_exchange_rate_v1_source_pb = require('../../../sdk/stream/aggregates_spot_exchange_rate_v1/source_pb.js');
goog.object.extend(proto, sdk_stream_aggregates_spot_exchange_rate_v1_source_pb);
goog.exportSymbol('proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1', null, global);
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1 = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.displayName = 'proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1';
}



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.prototype.toObject = function(opt_includeInstance) {
  return proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.toObject = function(includeInstance, msg) {
  var f, obj = {
    aggregate: jspb.Message.getFieldWithDefault(msg, 1, ""),
    code: jspb.Message.getFieldWithDefault(msg, 2, ""),
    price: jspb.Message.getFieldWithDefault(msg, 3, ""),
    sequenceId: jspb.Message.getFieldWithDefault(msg, 4, ""),
    sourcesMap: (f = msg.getSourcesMap()) ? f.toObject(includeInstance, proto.kaikosdk.Source.toObject) : [],
    timestamp: (f = msg.getTimestamp()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    uid: jspb.Message.getFieldWithDefault(msg, 7, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1}
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1;
  return proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1}
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setAggregate(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setCode(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setPrice(value);
      break;
    case 4:
      var value = /** @type {string} */ (reader.readString());
      msg.setSequenceId(value);
      break;
    case 5:
      var value = msg.getSourcesMap();
      reader.readMessage(value, function(message, reader) {
        jspb.Map.deserializeBinary(message, reader, jspb.BinaryReader.prototype.readString, jspb.BinaryReader.prototype.readMessage, proto.kaikosdk.Source.deserializeBinaryFromReader, "", new proto.kaikosdk.Source());
         });
      break;
    case 6:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setTimestamp(value);
      break;
    case 7:
      var value = /** @type {string} */ (reader.readString());
      msg.setUid(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getAggregate();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getCode();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getPrice();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
  f = message.getSequenceId();
  if (f.length > 0) {
    writer.writeString(
      4,
      f
    );
  }
  f = message.getSourcesMap(true);
  if (f && f.getLength() > 0) {
    f.serializeBinary(5, writer, jspb.BinaryWriter.prototype.writeString, jspb.BinaryWriter.prototype.writeMessage, proto.kaikosdk.Source.serializeBinaryToWriter);
  }
  f = message.getTimestamp();
  if (f != null) {
    writer.writeMessage(
      6,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getUid();
  if (f.length > 0) {
    writer.writeString(
      7,
      f
    );
  }
};


/**
 * optional string aggregate = 1;
 * @return {string}
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.prototype.getAggregate = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1} returns this
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.prototype.setAggregate = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string code = 2;
 * @return {string}
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.prototype.getCode = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1} returns this
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.prototype.setCode = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string price = 3;
 * @return {string}
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.prototype.getPrice = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/**
 * @param {string} value
 * @return {!proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1} returns this
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.prototype.setPrice = function(value) {
  return jspb.Message.setProto3StringField(this, 3, value);
};


/**
 * optional string sequence_id = 4;
 * @return {string}
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.prototype.getSequenceId = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 4, ""));
};


/**
 * @param {string} value
 * @return {!proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1} returns this
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.prototype.setSequenceId = function(value) {
  return jspb.Message.setProto3StringField(this, 4, value);
};


/**
 * map<string, Source> sources = 5;
 * @param {boolean=} opt_noLazyCreate Do not create the map if
 * empty, instead returning `undefined`
 * @return {!jspb.Map<string,!proto.kaikosdk.Source>}
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.prototype.getSourcesMap = function(opt_noLazyCreate) {
  return /** @type {!jspb.Map<string,!proto.kaikosdk.Source>} */ (
      jspb.Message.getMapField(this, 5, opt_noLazyCreate,
      proto.kaikosdk.Source));
};


/**
 * Clears values from the map. The map will be non-null.
 * @return {!proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1} returns this
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.prototype.clearSourcesMap = function() {
  this.getSourcesMap().clear();
  return this;};


/**
 * optional google.protobuf.Timestamp timestamp = 6;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.prototype.getTimestamp = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 6));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1} returns this
*/
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.prototype.setTimestamp = function(value) {
  return jspb.Message.setWrapperField(this, 6, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1} returns this
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.prototype.clearTimestamp = function() {
  return this.setTimestamp(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.prototype.hasTimestamp = function() {
  return jspb.Message.getField(this, 6) != null;
};


/**
 * optional string uid = 7;
 * @return {string}
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.prototype.getUid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 7, ""));
};


/**
 * @param {string} value
 * @return {!proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1} returns this
 */
proto.kaikosdk.StreamAggregatesSpotExchangeRateResponseV1.prototype.setUid = function(value) {
  return jspb.Message.setProto3StringField(this, 7, value);
};


goog.object.extend(exports, proto.kaikosdk);

// source: sdk/stream/aggregates_vwap_v1/request.proto
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

var sdk_core_instrument_criteria_pb = require('../../../sdk/core/instrument_criteria_pb.js');
goog.object.extend(proto, sdk_core_instrument_criteria_pb);
goog.exportSymbol('proto.kaikosdk.StreamAggregatesVWAPRequestV1', null, global);
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
proto.kaikosdk.StreamAggregatesVWAPRequestV1 = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.kaikosdk.StreamAggregatesVWAPRequestV1, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.kaikosdk.StreamAggregatesVWAPRequestV1.displayName = 'proto.kaikosdk.StreamAggregatesVWAPRequestV1';
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
proto.kaikosdk.StreamAggregatesVWAPRequestV1.prototype.toObject = function(opt_includeInstance) {
  return proto.kaikosdk.StreamAggregatesVWAPRequestV1.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.kaikosdk.StreamAggregatesVWAPRequestV1} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.kaikosdk.StreamAggregatesVWAPRequestV1.toObject = function(includeInstance, msg) {
  var f, obj = {
    instrumentCriteria: (f = msg.getInstrumentCriteria()) && sdk_core_instrument_criteria_pb.InstrumentCriteria.toObject(includeInstance, f),
    aggregate: jspb.Message.getFieldWithDefault(msg, 2, "")
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
 * @return {!proto.kaikosdk.StreamAggregatesVWAPRequestV1}
 */
proto.kaikosdk.StreamAggregatesVWAPRequestV1.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.kaikosdk.StreamAggregatesVWAPRequestV1;
  return proto.kaikosdk.StreamAggregatesVWAPRequestV1.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.kaikosdk.StreamAggregatesVWAPRequestV1} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.kaikosdk.StreamAggregatesVWAPRequestV1}
 */
proto.kaikosdk.StreamAggregatesVWAPRequestV1.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new sdk_core_instrument_criteria_pb.InstrumentCriteria;
      reader.readMessage(value,sdk_core_instrument_criteria_pb.InstrumentCriteria.deserializeBinaryFromReader);
      msg.setInstrumentCriteria(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setAggregate(value);
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
proto.kaikosdk.StreamAggregatesVWAPRequestV1.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.kaikosdk.StreamAggregatesVWAPRequestV1.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.kaikosdk.StreamAggregatesVWAPRequestV1} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.kaikosdk.StreamAggregatesVWAPRequestV1.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstrumentCriteria();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      sdk_core_instrument_criteria_pb.InstrumentCriteria.serializeBinaryToWriter
    );
  }
  f = message.getAggregate();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
};


/**
 * optional InstrumentCriteria instrument_criteria = 1;
 * @return {?proto.kaikosdk.InstrumentCriteria}
 */
proto.kaikosdk.StreamAggregatesVWAPRequestV1.prototype.getInstrumentCriteria = function() {
  return /** @type{?proto.kaikosdk.InstrumentCriteria} */ (
    jspb.Message.getWrapperField(this, sdk_core_instrument_criteria_pb.InstrumentCriteria, 1));
};


/**
 * @param {?proto.kaikosdk.InstrumentCriteria|undefined} value
 * @return {!proto.kaikosdk.StreamAggregatesVWAPRequestV1} returns this
*/
proto.kaikosdk.StreamAggregatesVWAPRequestV1.prototype.setInstrumentCriteria = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.kaikosdk.StreamAggregatesVWAPRequestV1} returns this
 */
proto.kaikosdk.StreamAggregatesVWAPRequestV1.prototype.clearInstrumentCriteria = function() {
  return this.setInstrumentCriteria(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.kaikosdk.StreamAggregatesVWAPRequestV1.prototype.hasInstrumentCriteria = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional string aggregate = 2;
 * @return {string}
 */
proto.kaikosdk.StreamAggregatesVWAPRequestV1.prototype.getAggregate = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.kaikosdk.StreamAggregatesVWAPRequestV1} returns this
 */
proto.kaikosdk.StreamAggregatesVWAPRequestV1.prototype.setAggregate = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


goog.object.extend(exports, proto.kaikosdk);

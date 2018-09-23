// Methods for reading the MagicaVoxel extension chunks

function readString(buffer, offset) {
  var n = buffer.readUIntLE(offset, 4);
  var value = buffer.toString('ascii', offset + 4, offset + 4 + n);

  return {
    value: value,
    bytesRead: n + 4
  };
}

function readDict(buffer, offset) {
  var size = buffer.readUIntLE(offset, 4);

  var dict = {};
  var memOffset = offset + 4;
  for (var i = 0; i < size; i++)
  {
    var key = readString(buffer, memOffset);
    memOffset += key.bytesRead;

    var value = readString(buffer, memOffset);
    memOffset += value.bytesRead;

    dict[key.value] = value.value;
  }

  return {
    dictionary: dict,
    bytesRead: memOffset - offset
  };
}

function readRotation(buffer, offset) {
  var rotValue = buffer.readUIntLE(offset, 2);
  return parseRotation(rotValue);
}

function parseRotation(rot) {
  var rotValue = (rot * 1) | 0;
  var rotation = [0, 0, 0,
                  0, 0, 0,
                  0, 0, 0];
  
  var idx1 = (rotValue & 0x03);
  var idx2 = (rotValue & 0x0c) >> 2;

  var r1 = -2 * ((rotValue & 0x10) >> 4) + 1;
  var r2 = -2 * ((rotValue & 0x20) >> 5) + 1;
  var r3 = -2 * ((rotValue & 0x40) >> 6) + 1;

  rotation[idx1] = r1;
  rotation[idx2] = r2;
  rotation[6] = r3;

  return rotation;
}

function readTransformChunk(chunk) {
  if (chunk.id != 'nTRN') return undefined;

  var nodeId = chunk.contents.readUIntLE(0, 4);
  var dict = readDict(chunk.contents, 4);

  var memOffset = dict.bytesRead + 4;

  var childId = chunk.contents.readUIntLE(memOffset, 4);
  memOffset += 4;

  var reservedId = chunk.contents.readIntLE(memOffset, 4);
  memOffset += 4;

  var layerId = chunk.contents.readUIntLE(memOffset, 4);
  memOffset += 4;

  var frameCount = chunk.contents.readUIntLE(memOffset, 4);
  memOffset += 4;

  var frameAttributes = [];
  for (var i = 0; i < frameCount; i++) {
    var attrDict = readDict(chunk.contents, memOffset);
    memOffset += attrDict.bytesRead;

    frameAttributes.push(attrDict.dictionary);
  }

  return {
    id: nodeId,
    attributes: dict.dictionary,
    childId: childId,
    layerId: layerId,
    frames: frameAttributes
  };
}

function readGroupChunk(chunk) {
  if (chunk.id != 'nGRP') return undefined;

  var nodeId = chunk.contents.readUIntLE(0, 4);
  var dict = readDict(chunk.contents, 4);
  var childCount = chunk.contents.readUIntLE(dict.bytesRead + 4, 4);
  var childIds = [];

  var memOffset = dict.bytesRead + 8;
  for (var i = 0; i < childCount; i++) {
    childIds.push(chunk.contents.readUIntLE(memOffset, 4));
    memOffset += 4;
  }

  return {
    id: nodeId,
    attributes: dict.dictionary,
    childNodes: childIds
  };
}

function readShapeChunk(chunk) {
  if (chunk.id != 'nSHP') return undefined;

  var nodeId = chunk.contents.readUIntLE(0, 4);
  var dict = readDict(chunk.contents, 4);
  var modelCount = chunk.contents.readUIntLE(dict.bytesRead + 4, 4);

  var memOffset = dict.bytesRead + 8;
  var modelAttributes = [];
  for (var i = 0; i < modelCount; i++) {
    var modelId = chunk.contents.readUIntLE(memOffset, 4);
    var attrDict = readDict(chunk.contents, memOffset + 4);

    modelAttributes.push({
      modelId: modelId,
      attributes: attrDict.dictionary
    });

    memOffset += attrDict.bytesRead + 4;
  }

  return {
    id: nodeId,
    attributes: dict.dictionary,
    modelData: modelAttributes
  };
}

function readMaterialChunk(chunk) {
  if (chunk.id != 'MATL') return undefined;

  var matId = chunk.contents.readUIntLE(0, 4);
  var dict = readDict(chunk.contents, 4);

  return {
    id: matId,
    properties: dict.dictionary
  };
}

function readLayerChunk(chunk) {
  if (chunk.id != 'LAYR') return undefined;

  var layerId = chunk.contents.readUIntLE(0, 4);
  var dict = readDict(chunk.contents, 4);
  var reservedId = chunk.contents.readIntLE(dict.bytesRead + 4, 4);

  return {
    id: layerId,
    attributes: dict.dictionary,
    reserved: reservedId
  };
}

exports.readTransformChunk = readTransformChunk;
exports.readGroupChunk = readGroupChunk;
exports.readLayerChunk = readLayerChunk;
exports.readShapeChunk = readShapeChunk;
exports.readMaterialChunk = readMaterialChunk;
exports.readRotation = readRotation;
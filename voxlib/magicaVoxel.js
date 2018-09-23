// Loader for MagicaVoxel files

var fs = require('fs');
var voxelModel = require('./voxelModel.js');
var mvExtensions = require('./magicavoxelExtensions.js');

// Helper Objects
function MVoxChunk(i, s, cs, c, ch) {
  this.id = i;
  this.size = s;
  this.childrenSize = cs;
  this.contents = c;
  this.children = ch;
}

// Load from a file
function load(fname) {
  var file = fs.openSync(fname, 'r');

  var buffer = new Buffer(4);

  // Read the Magic Number
  fs.readSync(file, buffer, 0, 4);
  if (buffer.toString('ascii') != 'VOX ')
    return undefined;

  // Read Version number, discard
  fs.readSync(file, buffer, 0, 4);

  // Read MAIN chunk
  main = readChunk(file);

  // Close it up
  fs.closeSync(file);

  return loadFromMain(main);
}

// Load the data from the MAIN chunk
function loadFromMain(chunk) {
  var palette = undefined;

  var sizes = [];
  var voxData = [];
  var materials = [];
  var models = [];
  var groups = [];
  var transforms = [];
  var layers = [];
  var shapes = [];

  // Load the Chunks
  for (var i = 0; i < chunk.children.length; i++) {
    if (chunk.children[i].id == 'SIZE') {
      sizes.push(chunk.children[i]);
    }
    else if (chunk.children[i].id == 'XYZI') {
      voxData.push(chunk.children[i]);
    }
    else if (chunk.children[i].id == 'RGBA') {
      palette = chunk.children[i];
    }
    else if (chunk.children[i].id == 'MATT' || chunk.children[i].id == 'MATL') {
      materials.push(chunk.children[i]);
    }
    else if (chunk.children[i].id == 'nTRN') {
      transforms.push(chunk.children[i]);
    }
    else if (chunk.children[i].id == 'nGRP') {
      groups.push(chunk.children[i]);
    }
    else if (chunk.children[i].id == 'nSHP') {
      shapes.push(chunk.children[i]);
    }
    else if (chunk.children[i].id == 'LAYR') {
      layers.push(chunk.children[i]);
    }
  }

  models = loadModels(sizes, voxData);

  var paletteData = loadPalette(palette);
  var materialData = loadMaterials(materials);
  var transformData = loadTransforms(transforms);
  var groupData = loadGroups(groups);
  var shapeData = loadShapes(shapes);
  var layerData = loadLayers(layers);

  return {
    modelCount: models.length,
    modelData: models,
    palette: paletteData,
    materials: materialData,
    transforms: transformData,
    groups: groupData,
    shapes: shapeData,
    layers: layerData
  };
}

function loadTransforms(transforms) {
  var transData = [];

  for (var i = 0; i < transforms.length; i++) {
    var trans = mvExtensions.readTransformChunk(transforms[i]);
    transData.push(trans);
  }

  return transData;
}

function loadShapes(shapes) {
  var shapeData = [];

  for (var i = 0; i < shapes.length; i++) {
    var data = mvExtensions.readShapeChunk(shapes[i]);
    shapeData.push(data);
  }

  return shapeData;
}

function loadGroups(groups) {
  var gData = [];

  for (var i = 0; i < groups.length; i++) {
    var data = mvExtensions.readShapeChunk(groups[i]);
    gData.push(data);
  }

  return gData;
}

function loadLayers(layers) {
  var lData = [];

  for (var i = 0; i < layers.length; i++) {
    var data = mvExtensions.readShapeChunk(layers[i]);
    lData.push(data);
  }

  return lData;
}

function loadModels(sizes, voxData) {
  var models = []; 
  
  // MagicaVoxel uses Z for height...we use it for depth
  for (var idx = 0; idx < sizes.length; idx++) {
    var size = sizes[idx];
    var voxels = voxData[idx];

    if (size !== undefined && voxels !== undefined) {
      var w = size.contents.readUIntLE(0, 4);
      var h = size.contents.readUIntLE(4, 4);
      var d = size.contents.readUIntLE(8, 4);

      if (w > 0 && h > 0 && d > 0) {
        var model = voxelModel({
          width: w,
          height: d,
          depth: h,
          zUp: false,
          id: idx
        });
        var numVoxels = voxels.contents.readUIntLE(0, 4);

        for (var j = 0; j < numVoxels; j++) {
          var x = voxels.contents[(j * 4) + 4];
          var y = voxels.contents[(j * 4) + 5];
          var z = voxels.contents[(j * 4) + 6];
          var i = voxels.contents[(j * 4) + 7];

          var index = x + (z * model.width) + ((model.depth - 1 - y) * model.width * model.height);
          if (index < w * h * d) {
            model.data[index] = i;
          }
        }

        models.push(model);
      }
    }
  }

  return models;
}

function loadPalette(palette) {
  var modelPalette = [];
  if (palette !== undefined) {
    modelPalette[0] = {
      r: 0,
      g: 0,
      b: 0,
      a: 0
    };
    for (var i = 0; i < palette.size; i += 4) {
      var red = palette.contents[i + 0];
      var green = palette.contents[i + 1];
      var blue = palette.contents[i + 2];
      var alpha = palette.contents[i + 3];

      modelPalette.push({
        r: red,
        g: green,
        b: blue,
        a: alpha
      });
    }
  } else {
    // Load a default palette of some sort
    modelPalette[0] = {
      r: 0,
      g: 0,
      b: 0,
      a: 0
    };
    for (var i = 0; i < 255; i++) {
      modelPalette.push({
        r: i,
        g: i,
        b: i,
        a: 1
      });
    }
  }

  return modelPalette;
}

function loadMaterials(materials, models) {
  if (materials === undefined) return [];

  var materialData = [];
  for (var i = 0; i < materials.length; i++) {
    var material = undefined;
    if (materials[i].id == 'MATT') {
      material = materialFromMATT(materials[i]);
    }
    else if (materials[i].id == 'MATL') {
      material = materialFromMATL(materials[i]);
    }
    
    if (material !== undefined) materialData.push(material);
  }

  return materialData;
}

function materialFromMATT(chunk) {
  if (chunk !== undefined) {
    var id = chunk.contents.readUIntLE(0, 4);
    var type = chunk.contents.readUIntLE(4, 4);
    var weight = chunk.contents.readFloatLE(8, 4);
    var properties = chunk.contents.readUIntLE(12, 4);

    var material = {
      id: id,
      class: chunk.id,
      type: '',
      weight: weight,
      properties: []
    };

    switch (type) {
      case 3:
        material.type = '_emit';
        break;
      case 2:
        material.type = '_glass';
        break;
      case 1:
        material.type = '_metal';
        break;
      case 0:
      default:
        material.type = '_diffuse';
        break;
    }

    // Getting the properties...kinda icky
    addMaterialProp(0x01, '_plastic', properties, material.properties);
    addMaterialProp(0x02, '_rough', properties, material.properties);
    addMaterialProp(0x04, '_spec', properties, material.properties);
    addMaterialProp(0x08, '_ior', properties, material.properties);
    addMaterialProp(0x10, '_att', properties, material.properties);
    addMaterialProp(0x20, '_power', properties, material.properties);
    addMaterialProp(0x40, '_glow', properties, material.properties);
    addMaterialProp(0x80, '_isTotalPower', properties, material.properties);

    for (var i = 0; i < material.properties.length; i++) {
      material.properties[i].value = chunk.contents.readFloatLE(16 + (i * 4), 4);
    }
  }

  return undefined;
}

function addMaterialProp(flag, name, data, props) {
  if (flag & data == flag) {
    props.push({
      name: name,
      value: 0
    });
  }
}

function materialFromMATL(chunk) {
  var matl = mvExtensions.readMaterialChunk(chunk);

  if (matl === undefined) return undefined;

  var material = {
    id: matl.id,
    class: chunk.id,
    type: matl.properties['_type'],
    weight: matl.properties['_weight'] * 1,
    properties: []
  };

  for (var prop in matl.properties) {
    if (prop == '_type' || prop == '_weight') continue;

    material.properties.push({
      name: prop,
      value: matl.properties[prop] * 1
    });
  }

  return material;
}

// Read a MagicaVoxel chunk from a file
function readChunk(file) {
  var chunk = new MVoxChunk('', 0, 0, undefined, []);

  var buffer = new Buffer(4);

  // Read ID
  if (fs.readSync(file, buffer, 0, 4) > 0)
    chunk.id = buffer.toString('ascii');

  // Read Size
  if (fs.readSync(file, buffer, 0, 4) > 0)
    chunk.size = buffer.readUIntLE(0, 4);

  // Read Size of Children
  if (fs.readSync(file, buffer, 0, 4) > 0)
    chunk.childrenSize = buffer.readUIntLE(0, 4);

  // Read Data
  if (chunk.size > 0) {
    chunk.contents = new Buffer(chunk.size);
    fs.readSync(file, chunk.contents, 0, chunk.size);
  }

  // Read Children Data
  var currentSize = 0;
  if (chunk.childrenSize > 0) {
    while (currentSize < chunk.childrenSize) {
      var childChunk = readChunk(file);
      chunk.children.push(childChunk);
      currentSize += 12 + childChunk.size + childChunk.childrenSize;
    }
  }

  return chunk;
}

// Exported Functions
exports.load = load;
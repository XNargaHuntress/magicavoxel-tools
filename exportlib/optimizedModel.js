// Creates an optimized model from voxels
// Creates packed textures for Albedo, Metalness, Roughness and Emissive

var packing = require('./packing.js');
var png = require('pngjs').PNG;
var fs = require('fs');

var SWEEP_DIR = {
  XPos: 0,
  XNeg: 1,
  YPos: 2,
  YNeg: 3,
  ZPos: 4,
  ZNeg: 5
};

var NORMALS = [
  {x:  1, y:  0, z:  0},
  {x: -1, y:  0, z:  0},
  {x:  0, y:  1, z:  0},
  {x:  0, y: -1, z:  0},
  {x:  0, y:  0, z:  1},
  {x:  0, y:  0, z: -1}
];

function texMap(w,h,data) {
  this.w = w;
  this.h = h;
  this.data = data;
}

// We assume the following setup:
/*
   v1+-------+v2
     |       |
     |       |
   v4+-------+v3
   data goes left-to-right and top-to-bottom
*/
function face4(v1, v2, v3, v4, normal, texMap) {
  this.v1 = v1;
  this.v2 = v2;
  this.v3 = v3;
  this.v4 = v4;
  this.normalIndex = normal;
  this.texMap = texMap;

  this.normal = NORMALS[normal];
}

function refVal(value) {
  this.val = value;
}

function generateFaces(voxModel, direction, center)
{
  // Setup the "pointers" for dealing with the generation of things
  // ===============================================================
  var x,y,z;
  var w,d,h;
  var w_max,d_max,h_max;
  var depthCheck = direction % 2 == 0 ? 1 : -1;

  x = new refVal(0);
  y = new refVal(0);
  z = new refVal(0);

  w_max = 0; d_max = 0; h_max = 0;

  switch (direction)
  {
    case SWEEP_DIR.XNeg:
    case SWEEP_DIR.XPos:
      d = x;
      w = y;
      h = z;
      d_max = voxModel.width;
      w_max = voxModel.height;
      h_max = voxModel.depth;
      break;
    case SWEEP_DIR.YNeg:
    case SWEEP_DIR.YPos:
      d = y;
      w = z;
      h = x;
      d_max = voxModel.height;
      w_max = voxModel.depth;
      h_max = voxModel.width;
      break;
    case SWEEP_DIR.ZNeg:
    case SWEEP_DIR.ZPos:
      d = z;
      w = x;
      h = y;
      d_max = voxModel.depth;
      w_max = voxModel.width;
      h_max = voxModel.height;
      break;
    default:
      d = z;
      w = x;
      h = y;
      break;
  }

  // Sweep through the model and generate the faces
  // ===============================================
  var quads = [];

  for (d.val = 0; d.val < d_max; d.val++)
  {
    var sliceQuads = [];
    for (h.val = 0; h.val < h_max; h.val++)
    {
      var rowQuads = [];
      var r_index = 0;
      for (w.val = 0; w.val < w_max; w.val++)
      {
        // Grab the current voxel
        var c_index = x.val + (y.val * voxModel.width) + (z.val * voxModel.width * voxModel.height);
        if (voxModel.data[c_index] == 0x00)
          continue;

        // Grab the depth-wise adjacent voxel
        d.val += depthCheck;
        var d_index = x.val + (y.val * voxModel.width) + (z.val * voxModel.width * voxModel.height);
        d.val -= depthCheck;

        // If the adjacent voxel is not empty, then skip the current voxel
        if (d.val == 0 && depthCheck == 1 && voxModel.data[d_index] > 0)
          continue;
        else if (d.val == d_max - 1 && depthCheck == -1 && voxModel.data[d_index] > 0)
          continue;
        else if (d.val > 0 && d.val < d_max - 1 && voxModel.data[d_index] > 0)
          continue;

        // Process this voxel
        // -------------------------
        if (rowQuads.length <= 0)
        {
          rowQuads.push({
            h: 1,
            w: 1,
            x: w.val,
            y: h.val,
            data: [voxModel.data[c_index]]
          });
          r_index = 0;
        }
        else {
          if (rowQuads[r_index].x + rowQuads[r_index].w == w.val)
          {
            rowQuads[r_index].w += 1;
            rowQuads[r_index].data.push(voxModel.data[c_index]);
          }
          else {
            rowQuads.push({
              h: 1,
              w: 1,
              x: w.val,
              y: h.val,
              data: [voxModel.data[c_index]]
            });

            // Update r_index to keep looking at current one
            r_index += 1;
          }
        }
      }

      // Process the row
      // -------------------
      for (var i = 0; i < rowQuads.length; i++)
      {
        var r_quad = rowQuads[i];

        if (sliceQuads.length > 0)
        {
          // Filter out the list
          var s_temp = [];
          for (var j = 0; j < sliceQuads.length; j++)
          {
            var s_quad = sliceQuads[j];
            if (s_quad.y + s_quad.h == r_quad.y &&
                s_quad.x == r_quad.x)
            {
              s_temp.push(s_quad);
            }
          }

          if (s_temp.length != 1)
            sliceQuads.push(r_quad);
          else
          {
            if (s_temp[0].w < r_quad.w)
            {
              s_temp[0].h += 1;
              r_quad.w -= s_temp[0].w;
              r_quad.x += s_temp[0].w;
              for (var l = 0; l < s_temp[0].w; l++)
              {
                s_temp[0].data.push(r_quad.data[l]);
              }
              r_quad.data = r_quad.data.slice(s_temp[0].w);
              i -= 1;
            }
            else if(s_temp[0].w == r_quad.w)
            {
              s_temp[0].h += 1;
              for (var l = 0; l < r_quad.data.length; l++)
                s_temp[0].data.push(r_quad.data[l]);
            }
            else
            {
              sliceQuads.push(r_quad);
            }
          }
        }
        else
        {
          sliceQuads.push(r_quad);
        }
      }
    }
    var processedQuads = processSlice(sliceQuads, d.val, direction, voxModel.width, voxModel.depth, center);
    for (var q = 0; q < processedQuads.length; q++)
      quads.push(processedQuads[q]);
  }

  return quads;
}

function processSlice(slices, s_depth, direction, width, depth, center)
{
  var faces = [];

  var x,y,z;
  var w,h,d;

  x = new refVal(0);
  y = new refVal(0);
  z = new refVal(0);

  switch (direction)
  {
    case SWEEP_DIR.XNeg:
    case SWEEP_DIR.XPos:
      d = x;
      w = y;
      h = z;
      break;
    case SWEEP_DIR.YNeg:
    case SWEEP_DIR.YPos:
      d = y;
      w = z;
      h = x;
      break;
    case SWEEP_DIR.ZNeg:
    case SWEEP_DIR.ZPos:
    default:
      d = z;
      w = x;
      h = y;
      break;
  }

  d.val = s_depth;
  d.val += direction % 2 == 0 ? 1 : 0;

  for (var i = 0; i < slices.length; i++)
  {
    var quad = slices[i];

    w.val = quad.x;
    h.val = quad.y;
    var v4 = {x: x.val - (center ? width * 0.5 : 0), y: y.val, z: z.val - (center ? depth * 0.5 : 0)};

    w.val = quad.x + quad.w;
    var v3 = {x: x.val - (center ? width * 0.5 : 0), y: y.val, z: z.val - (center ? depth * 0.5 : 0)};

    h.val = quad.y + quad.h;
    var v2 = {x: x.val - (center ? width * 0.5 : 0), y: y.val, z: z.val - (center ? depth * 0.5 : 0)};

    w.val = quad.x;
    var v1 = {x: x.val - (center ? width * 0.5 : 0), y: y.val, z: z.val - (center ? depth * 0.5 : 0)};

    var t_map = new texMap(quad.w, quad.h, quad.data);
    var face = new face4(v1, v2, v3, v4, direction, t_map, direction);

    faces.push(face);
  }

  return faces;
}

function getMaterialMap(materials) {
  var map = {};

  if (materials !== undefined) {
    for (var i = 0; i < materials.length; i++) {
      map[materials[i].id] = materials[i];
    }
  }

  return map;
}

function createPalettePng(palette, materialMap) {
  var albedo = new png({width: 16, height: 16, fill: true});
  var metal = new png({width: 16, height: 16, fill: true});
  var emissive = new png({width: 16, height: 16, fill: true});

  for (var y = 0; y < 16; y++) {
    for (var x = 0; x < 16; x++) {
      var idx = (16 * y + x) << 2;

      var cIdx = y * 16 + x;
      var color = palette[cIdx];
      var material = materialMap[cIdx];

      albedo.data[idx + 0] = color.r;
      albedo.data[idx + 1] = color.g;
      albedo.data[idx + 2] = color.b;
      albedo.data[idx + 3] = 255;

      metal.data[idx + 3] = 0;
      emissive.data[idx + 3] = 255;

      if (material !== undefined) {
        switch (material.type) {
          case '_metal':
            metal.data[idx + 0] = (material.weight * 255) | 0;
            metal.data[idx + 1] = (material.weight * 255) | 0;
            metal.data[idx + 2] = (material.weight * 255) | 0;
            metal.data[idx + 3] = 255 - ((material.properties['_rough'] * 255) | 0);
            break;
          case '_emit':
            emissive.data[idx + 0] = color.r;
            emissive.data[idx + 1] = color.g;
            emissive.data[idx + 2] = color.b;
            emissive.data[idx + 3] = (material.weight * 255) | 0;
            break;
          default:
            break;
        }
      }
    }
  }

  return {
    albedo: albedo,
    metal: metal,
    emissive: emissive
  }
}

function blitRect(src, dst, sx, sy, dx, dy, dw, dh) {
  for (y = 0; y < dh; y++) {
    for (x = 0; x < dw; x++) {
      var tmpY = (dst.height - 1) - (dy + y);
      png.bitblt(src, dst, sx, sy, 1, 1, dx + x, tmpY);
    }
  }
}

function createTextures(faces, palette, materials, texelSize = 3, padding = 1) {
  var imageSize = packing.pack(faces, texelSize, padding);
  console.log('Packing Complete. Creating Maps...');
  var materialMap = getMaterialMap(materials);
  var palImg = createPalettePng(palette, materialMap);

  // Create PNGs
  var albedo = new png({width: imageSize.w, height: imageSize.h, fill: true});
  var metal = new png({width: imageSize.w, height: imageSize.h, fill: true});
  var emissive = new png({width: imageSize.w, height: imageSize.h, fill: true});

  for (var i = 0; i < faces.length; i++) {
    var quad = faces[i];

    // Move to the position in the image...or create temp png?
    var xOffset = quad.pixelRect.x;
    var yOffset = quad.pixelRect.y;

    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write('Quad ' + (i + 1) + '/' + faces.length);

    for (var y = 0; y < quad.texMap.h; y++) {
      for (var x = 0; x < quad.texMap.w; x++) {
        var index = x + y * quad.texMap.w;
        var x_actual = texelSize * x + (x == 0 ? 0 : padding);
        var y_actual = texelSize * y + (y == 0 ? 0 : padding);
        var w_actual = texelSize + (x == 0 || x == quad.texMap.w - 1 ? padding : 0) + (quad.texMap.w == 1 ? padding : 0);
        var h_actual = texelSize + (y == 0 || y == quad.texMap.h - 1 ? padding : 0) + (quad.texMap.h == 1 ? padding : 0);

        var tex_x = (quad.texMap.data[index] % 16) | 0;
        var tex_y = (quad.texMap.data[index] / 16) | 0;
        blitRect(palImg.albedo, albedo, tex_x, tex_y, xOffset + x_actual, yOffset + y_actual, w_actual, h_actual);
        blitRect(palImg.metal, metal, tex_x, tex_y, xOffset + x_actual, yOffset + y_actual, w_actual, h_actual);
        blitRect(palImg.emissive, emissive, tex_x, tex_y, xOffset + x_actual, yOffset + y_actual, w_actual, h_actual);
      }
    }

    // Setup the UVs
    quad.v4.uv = {
      x: (quad.pixelRect.x + padding) / imageSize.w,
      y: (quad.pixelRect.y + padding) / imageSize.h
    };
    quad.v3.uv = {
      x: (quad.pixelRect.x + quad.pixelRect.w - padding) / imageSize.w,
      y: (quad.pixelRect.y + padding) / imageSize.h
    };
    quad.v2.uv = {
      x: (quad.pixelRect.x + quad.pixelRect.w - padding) / imageSize.w,
      y: (quad.pixelRect.y + quad.pixelRect.h - padding) / imageSize.h
    };
    quad.v1.uv = {
      x: (quad.pixelRect.x + padding) / imageSize.w,
      y: (quad.pixelRect.y + quad.pixelRect.h - padding) / imageSize.h
    };
  }

  process.stdout.write('\n');

  return {
    albedo: albedo,
    metal: metal,
    emissive: emissive
  };
}

function createFromOne (voxModel, palette, materials, texelSize = 3, padding = 1, center = false) {
  var faces = [];

  for (var direction = 0; direction < 6; direction++) {
    var tempFaces = generateFaces(voxModel, direction, center);
    for (var i = 0; i < tempFaces.length; i++) {
      faces.push(tempFaces[i]);
    }
  }

  var maps = createTextures(faces, palette, materials, texelSize, padding);

  return {
    faces: faces,
    maps: maps
  };
};

exports.createFromAll = function (magicaModel, atlas = true, texelSize = 3, padding = 1, center = false) {
  var models = [];
  var maps = [];

  if (atlas == false) {
    for (var i = 0; i < magicaModel.modelData.length; i++) {
      var result = createFromOne(magicaModel.modelData[i], magicaModel.palette, magicaModel.materials, texelSize, padding, center);
      models.push(result.faces);
      maps.push(result.maps);
    }
  }
  else {
    var aggregateFaces = [];
    for (var i = 0; i < magicaModel.modelData.length; i++) {
      models.push([]);

      var vm = magicaModel.modelData[i];

      for (var direction = 0; direction < 6; direction++) {
        var tempFaces = generateFaces(vm, direction, center);

        for (var j = 0; j < tempFaces.length; j++) {
          models[i].push(tempFaces[j]);
          aggregateFaces.push(tempFaces[j]);
        }
      }
    }

    console.log('Packing Textures...');
    var aggregateMaps = createTextures(aggregateFaces, magicaModel.palette, magicaModel.materials, texelSize, padding);
    maps.push(aggregateMaps);
  }

  return {
    models: models,
    maps: maps
  }
}

exports.NORMAL_INDEX = SWEEP_DIR;
exports.NORMALS = NORMALS;
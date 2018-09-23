// Voxel to Object Converter
// This will eventually output an optimized obj file

var fs = require('fs');
var voxmodel = require('./voxModel.js');
var packing = require('./packing.js');

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

function vertex(x, y, z, uvx, uvy)
{
  this.x = x;
  this.y = y;
  this.z = z;
}

function texMap(w,h,data)
{
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
function face4(v1, v2, v3, v4, normal, texMap)
{
  this.v1 = v1;
  this.v2 = v2;
  this.v3 = v3;
  this.v4 = v4;
  this.normalIndex = normal;
  this.texMap = texMap;

  this.normal = NORMALS[normal];
}

function refVal(value)
{
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

  console.log('G_FACES: ' + direction);

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

  console.log("SWEEP DIRECTION: " + direction);

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

function createPackedTexture(faces, texelSize, padding, canvas, ctx, pal)
{
  var imageSize = packing.pack(faces, texelSize, padding);
  canvas.width = imageSize.w;
  canvas.height = imageSize.h;

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, imageSize.w, imageSize.h);

  ctx.translate(0, imageSize.h);
  ctx.scale(1, -1);

  for (var i = 0; i < faces.length; i++)
  {
    var quad = faces[i];
    ctx.save();
    ctx.translate(quad.pixelRect.x, quad.pixelRect.y);

    // Draw the face
    for (var y = 0; y < quad.texMap.h; y++)
    {
      for (var x = 0; x < quad.texMap.w; x++)
      {
        var index = x + y * quad.texMap.w;
        var x_actual = texelSize * x + (x == 0 ? 0 : padding);
        var y_actual = texelSize * y + (y == 0 ? 0 : padding);
        var w_actual = texelSize + (x == 0 || x == quad.texMap.w - 1 ? padding : 0) + (quad.texMap.w == 1 ? padding : 0);
        var h_actual = texelSize + (y == 0 || y == quad.texMap.h - 1 ? padding : 0) + (quad.texMap.h == 1 ? padding : 0);

        var tex_x = ((quad.texMap.data[index] - 1) % 16) | 0;
        var tex_y = ((quad.texMap.data[index] - 1) / 16) | 0;
        ctx.drawImage(pal, (tex_x * 4) + 1, (tex_y * 4) + 1, 2, 2, x_actual, y_actual, w_actual, h_actual);
      }
    }

    ctx.restore();

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

  return canvas;
}

function model(options)
{
  this.faces = undefined;
  this.texture = undefined;
  this.texelSize = 3;
  this.padding = 1;

  for (var prop in options)
  {
    if (this.hasOwnProperty(prop))
      this[prop] = options[prop];
  }
}

function writeNormals(sb)
{
  sb.push('# Vertex Normals\n');
  for (var i = 0; i < NORMALS.length; i++)
  {
    sb.push('vn ' + NORMALS[i].x + ' ' + NORMALS[i].y + ' ' + NORMALS[i].z + '\n');
  }
  sb.push('\n');
}

function writeFaces(faces, sb)
{
  sb.push('# Faces\n');
  for (var i = 0; i < faces.length; i++)
  {
    var face = faces[i];
    sb.push('\n#Face [' + i + ']\n');
    sb.push('v ' + face.v1.x + ' ' + face.v1.y + ' ' + face.v1.z + '\n');
    sb.push('v ' + face.v2.x + ' ' + face.v2.y + ' ' + face.v2.z + '\n');
    sb.push('v ' + face.v3.x + ' ' + face.v3.y + ' ' + face.v3.z + '\n');
    sb.push('v ' + face.v4.x + ' ' + face.v4.y + ' ' + face.v4.z + '\n');
    sb.push('vt ' + face.v1.uv.x + ' ' + face.v1.uv.y + '\n');
    sb.push('vt ' + face.v2.uv.x + ' ' + face.v2.uv.y + '\n');
    sb.push('vt ' + face.v3.uv.x + ' ' + face.v3.uv.y + '\n');
    sb.push('vt ' + face.v4.uv.x + ' ' + face.v4.uv.y + '\n');
    sb.push('f ');
    if (face.normalIndex == SWEEP_DIR.XPos ||
        face.normalIndex == SWEEP_DIR.ZPos ||
        face.normalIndex == SWEEP_DIR.YPos)
    {
      sb.push((-1) + '/' + (-1) + '/' + (face.normalIndex + 1) + ' ');
      sb.push((-2) + '/' + (-2) + '/' + (face.normalIndex + 1) + ' ');
      sb.push((-3) + '/' + (-3) + '/' + (face.normalIndex + 1) + ' ');
      sb.push((-4) + '/' + (-4) + '/' + (face.normalIndex + 1) + ' ');
    }
    else
    {
      sb.push((-4) + '/' + (-4) + '/' + (face.normalIndex + 1) + ' ');
      sb.push((-3) + '/' + (-3) + '/' + (face.normalIndex + 1) + ' ');
      sb.push((-2) + '/' + (-2) + '/' + (face.normalIndex + 1) + ' ');
      sb.push((-1) + '/' + (-1) + '/' + (face.normalIndex + 1) + ' ');
    }
    sb.push('\n');
  }
}

model.prototype = {
  convertVoxels: function(voxModel, canvas, ctx, pal, center, callback){
    this.faces = [];
    for (var dir = 0; dir < 6; dir++)
    {
      var temp_faces = generateFaces(voxModel, dir, center);
      for (var i = 0; i < temp_faces.length; i++)
        this.faces.push(temp_faces[i]);
    }

    ctx.imageSmoothingEnabled = false;
    this.texture = createPackedTexture(this.faces, this.texelSize, this.padding, canvas, ctx, pal);

    if (callback != undefined)
      callback();
  },
  saveOBJ: function(f_name)
  {
    var sb = [];
    sb.push('# Created with VoxToObj\n');
    sb.push('# VoxToObj author: @xgundam05\n\n');

    writeNormals(sb);
    writeFaces(this.faces, sb);

    fs.writeFile(f_name, sb.join(''), function (err){
      if (err) throw err;
    });
  }
};

exports.optimizedModel = model;
exports.NORMALS = NORMALS;
exports.NORMAL_INDEX = SWEEP_DIR;
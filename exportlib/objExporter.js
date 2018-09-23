
var fs = require('fs');
var om = require('./optimizedModel.js');

function writeNormals(sb) {
  sb.push('# Vertex Normals\n');
  for (var i = 0; i < om.NORMALS.length; i++) {
    sb.push('vn ' + om.NORMALS[i].x + ' ' + om.NORMALS[i].y + ' ' + om.NORMALS[i].z + '\n');
  }
  sb.push('\n');
}

function writeFaces(faces, sb) {
  sb.push('# Faces\n');
  for (var i = 0; i < faces.length; i++) {
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
    if (face.normalIndex == om.NORMAL_INDEX.XPos ||
        face.normalIndex == om.NORMAL_INDEX.ZPos ||
        face.normalIndex == om.NORMAL_INDEX.YPos) {
      sb.push((-1) + '/' + (-1) + '/' + (face.normalIndex + 1) + ' ');
      sb.push((-2) + '/' + (-2) + '/' + (face.normalIndex + 1) + ' ');
      sb.push((-3) + '/' + (-3) + '/' + (face.normalIndex + 1) + ' ');
      sb.push((-4) + '/' + (-4) + '/' + (face.normalIndex + 1) + ' ');
    }
    else {
      sb.push((-4) + '/' + (-4) + '/' + (face.normalIndex + 1) + ' ');
      sb.push((-3) + '/' + (-3) + '/' + (face.normalIndex + 1) + ' ');
      sb.push((-2) + '/' + (-2) + '/' + (face.normalIndex + 1) + ' ');
      sb.push((-1) + '/' + (-1) + '/' + (face.normalIndex + 1) + ' ');
    }
    sb.push('\n');
  }
}

exports.saveOBJ = function(filename, optimizedModelSet) {
  for (var i = 0; i < optimizedModelSet.models.length; i++)
  {
    var sb = [];
    var model = optimizedModelSet.models[i];

    sb.push('# Created with MagicaVoxel tools');
    sb.push('# Tools Author: Laerin Anderson');

    writeNormals(sb);
    writeFaces(model, sb);

    var num = i + '';
    if (num.length > 3) {
      for (var j = 0; j < 3 - num.length; j++)
        num = '0' + num;
    }

    fs.writeFile(filename + '_' + num + '.obj', sb.join(''), (err) => {
      if (err) throw err;
    });
  }
}
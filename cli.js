// CLI tools for accessing convert functionality

var magicaVoxel = require('./voxlib/magicaVoxel.js');
var om = require('./exportlib/optimizedModel.js');
var objExport = require('./exportlib/objExporter.js');
var fs = require('fs');
var PNG = require('pngjs').PNG;

var inputfile = process.argv[2];
var outputfile = process.argv[3];

console.log('Loading Voxel File...');
var voxModel = magicaVoxel.load(inputfile);
console.log('Sub Models: ' + voxModel.modelCount);
console.log('Materials: ' + voxModel.materials.length);

console.log('Optimizing Mesh and Textures...');
var modelSet = om.createFromAll(voxModel, true, 4, 1, true);


if (outputfile.endsWith('.obj')) {
  outputfile = outputfile.substr(0, outputfile.length - 4);
}

console.log('Saving Models...');
objExport.saveOBJ(outputfile, modelSet);

console.log('Saving Texture Maps...');
for (var i = 0; i < modelSet.maps.length; i++) {
  var map = modelSet.maps[i];

  var num = i + '';
  if (num.length > 3) {
    for (var j = 0; j < 3 - num.length; j++)
      num = '0' + num;
  }

  var aBuff = PNG.sync.write(map.albedo);
  var mBuff = PNG.sync.write(map.metal);
  var eBuff = PNG.sync.write(map.emissive);

  fs.writeFileSync(outputfile + '_' + num + '_A.png', aBuff);
  fs.writeFileSync(outputfile + '_' + num + '_M.png', mBuff);
  fs.writeFileSync(outputfile + '_' + num + '_E.png', eBuff);
}

console.log('Conversion Complete!');
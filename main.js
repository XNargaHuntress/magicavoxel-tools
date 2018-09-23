// The main export of doom!

var magicaVoxel = require('./voxlib/magicaVoxel.js');
var sceneGraph = require('./voxlib/sceneGraph.js');
var om = require('./exportlib/optimizedModel.js');
var objExport = require('./exportlib/objExporter.js');

exports.loadVoxFile = function (filename) {
    var model = magicaVoxel.load(filename);

    return model;
}

exports.buildScenGraph = function (model) {
    var hierarchy = sceneGraph.construct(model);

    return hierarchy;
}

exports.loadAndBuildGraph = function (filename) {
    var model = magicaVoxel.load(filename);
    var hierarchy = sceneGraph.construct(model);

    return {
        model: model,
        graph: hierarchy
    };
}

exports.optimize = om.createFromAll;

exports.loadOptimized = function (filename, atlas = true, texelSize = 3, padding = 1) {
    var magicaModel = magicaVoxel.load(filename);
    var optimized = om.createFromAll(magicaModel, atlas, texelSize, padding);

    return optimized;
}

exports.saveToObj = function (filename, modelSet) {
    if (filename.endsWith('.obj')) {
        filename = filename.substr(0, filename.length - 4);
    }

    objExport.saveOBJ(filename, modelSet);

    for (var i = 0; i < modelSet.maps.length; i++) {
        var map = modelSet.maps[i];

        var num = i + '';
        if (num.length > 3) {
        for (var j = 0; j < 3 - num.length; j++)
            num = '0' + num;
        }

        map.albedo.pack().pipe(fs.createWriteStream(filename + '_' + num + '_A.png'));
        map.metal.pack().pipe(fs.createWriteStream(filename + '_' + num + '_M.png'));
        map.emissive.pack().pipe(fs.createWriteStream(filename + '_' + num + '_E.png'));
    }
}

exports.convertToObj = function (infile, outfile, atlas = true, texelSize = 3, padding = 1) {
    var magicaModel = magicaVoxel.load(infile);
    var modelSet = om.createFromAll(magicaModel, atlas, texelSize, padding);

    exports.saveToObj(outfile, modelSet);
}
// Handle the MagicaVoxel scene graph
function mvTransform(options) {
  this.attributes = {};
  this.nodeAttributes = {};
  this.nodeType = '';
  this.parent = undefined;
  this.children = [];
  this.position = {x: 0, y: 0, z: 0};
  this.rotation = undefined;
  this.models = [];
  this.id = -1;
  this.nodeId = -1;

  if (options !== undefined) {
    for (var prop in options)
      if (this.hasOwnProperty(prop))
        this[prop] = options[prop];
  }
}

function constructMVSceneGraph(mvModel) {
  if (mvModel.transforms === undefined || mvModel.transforms.length <= 0) {
    var root = new mvTransform({id: 0, models: mvModel.models});
    return root;
  } else {
    var transformCopy = copyArray(mvModel.transforms);
    var groupCopy = copyArray(mvModel.groups);
    var shapeCopy = copyArray(mvModel.shapes);

    return buildGraph(transformCopy, groupCopy, shapeCopy, mvModel.models, mvModel.layers);
  }
}

function buildGraph(transforms, groups, shapes, models, layers) {
  var nodes = {};
  var nodeArr = []
  var childCheck = {};
  for (var i = 0; i < transforms.length; i++) {
    var node = transformFromTransform(transforms[i]);

    childCheck[node.id] = false;
    nodes[node.id] = node;
    nodeArr.push(node);
  }

  for (var i = 0; i < groups.length; i++) {
    var parentTrans = findByChildId(groups[i].id);
    var parentNode = nodes[parentTrans.id];

    parentNode.nodeType = 'group';
    parentNode.nodeAttributes = groups[i].attributes;

    var childNodes = [];
    for (var j = 0; j < groups[i].childNodes.length; j++) {
      var node = nodes[groups[i].childNodes[j]];

      node.parent = parentNode;
      childCheck[node.id] = true;
      childNodes.push(node);
    }

    parentNode.children = childNodes;
  }

  for (var i = 0; i < shapes.length; i++) {
    var parentTrans = findByChildId(shapes[i].id);
    var parentNode = nodes[parentTrans.id];

    parentNode.nodeType = 'shape';
    parentNode.nodeAttributes = shapes[i].attributes;

    for (var j = 0; j < shapes[i].modelData.length; j++) {
      var modelData = shapes[i].modelData[j];
      var modelIdx = models.findById(models, modelData.modelId);
      if (modelIdx >= 0) {
        var model = models[modelIds];
        model.attributes = modelData.attributes;

        parentNode.models.push(model);
      }
    }
  }

  for (var i = 0; i < nodeArr.length; i++) {
    if (childCheck[nodeArr[i].id] == false)
      return nodeArr[i];
  }

  return nodeArr[0];
}

function transformFromTransform(transform) {
  var trans = new mvTransform({
    id: transform.id,
    attributes: transform.attributes
  });

  // TODO: get position
  // TODO: get rotation

  return trans;
}

function findById(arr, id) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].id == id) return i;
  }

  return -1;
}

function findByChildId(arr, childId) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].childId == childId) return i;
  }

  return -1;
}

function copyArray(source) {
  var dest = []

  for (var i = 0; i < source.length; i++)
    dest.push(source[i]);

  return dest;
}

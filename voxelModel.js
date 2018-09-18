function voxelModel(options) {
  this.width = 0;
  this.height = 0;
  this.depth = 0;
  this.zUp = false;
  this.data = [];
  this.id = 0;
  this.attributes = {};

  if (options) {
    for (var prop in options)
      if (this.hasOwnProperty(prop))
        this[prop] = options[prop];
  }

  for (var i = 0; i < this.width * this.height * this.depth; i++) {
    this.data[i] = 0x00;
  }
}

voxelModel.prototype = {
  getVoxelBuffer: function () {
    var buffer = new ArrayBuffer(this.width * this.height * this.depth);
    var view = new Uint8Array(buffer);

    if (this.zUp) {
      for (var z = 0; z < this.depth; z++) {
        for (var y = 0; y < this.height; y++) {
          for (var x = 0; x < this.width; x++) {
            var vox = this.data[x + (y * this.width) + (z * this.width * this.height)];
            var idx = x + (z * this.width) + ((this.height - 1 - y) * this.width * this.depth);
            view[idx] = vox;
          }
        }
      }
    } else {
      for (var i = 0; i < this.data.length; i++)
        view[i] = this.data[i];
    }

    return buffer;
  },
  getVolume: function () {
    var volume = 0;
    for (var i = 0; i < this.data.length; i++) {
      if (this.data[i] !== 0x00)
        volume++;
    }

    return volume;
  }
};

module.exports = exports = function (options) {
  return new voxelModel(options);
};

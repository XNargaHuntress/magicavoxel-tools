function rect(x, y, w, h)
{
  this.x = x;
  this.y = y;
  this.w = w;
  this.h = h;
}

rect.prototype = {
  area: function()
  {
    return this.width * this.height;
  }
};

function node()
{
  this.bounds = undefined;
  this.children = [];
  this.quad = undefined;
}

node.prototype = {
  insert: function(quad)
  {
    // INSERT THE QUAD
    // If we don't fit, return false
    if (this.bounds.w < quad.pixelRect.w || this.bounds.h < quad.pixelRect.h)
      return false;

    if (this.children != undefined && this.children.length > 0)
    {
      // We are a branch and not a leaf, try inserting into the leaves
      var childInsert = this.children[0].insert(quad);
      if (!childInsert) childInsert = this.children[1].insert(quad);
      return childInsert;
    }
    else
    {
      // If there's already a quad here, return false
      if (this.quad != undefined)
        return false;

      // If it's a perfect fit, deal with it
      if (this.bounds.w == quad.pixelRect.w && this.bounds.h == quad.pixelRect.h)
      {
        this.quad = quad;
        return true;
      }

      // Otherwise, divide and conquer
      this.children.push(new node());
      this.children.push(new node());

      var dw = this.bounds.w - quad.pixelRect.w;
      var dh = this.bounds.h - quad.pixelRect.h;

      if (dw > dh)
      {
        this.children[0].bounds = new rect(this.bounds.x, this.bounds.y, quad.pixelRect.w, this.bounds.h);
        this.children[1].bounds = new rect(this.bounds.x + quad.pixelRect.w, this.bounds.y, this.bounds.w - quad.pixelRect.w, this.bounds.h);
      }
      else
      {
        this.children[0].bounds = new rect(this.bounds.x, this.bounds.y, this.bounds.w, quad.pixelRect.h);
        this.children[1].bounds = new rect(this.bounds.x, this.bounds.y + quad.pixelRect.h, this.bounds.w, this.bounds.h - quad.pixelRect.h);
      }

      return this.children[0].insert(quad);
    }
  },
  clear: function()
  {
    // CLEAR
    if (this.children[0] != undefined)
      this.children[0].clear();
    if (this.children[1] != undefined)
      this.children[1].clear();

    this.quad = undefined;
    this.children = undefined;
  },
  applyRect: function()
  {
    // APPLY THE NEW BOUNDS
    if (this.quad != undefined)
    {
      this.quad.pixelRect.x = this.bounds.x;
      this.quad.pixelRect.y = this.bounds.y;
      this.quad.pixelRect.w = this.bounds.w;
      this.quad.pixelRect.h = this.bounds.h;
    }
    else
    {
      // We are not a leaf, so go down through the children
      if (this.children[0] != undefined)
        this.children[0].applyRect();
      if (this.children[1] != undefined)
        this.children[1].applyRect();
    }
  }
};

// UTILITIES
// --------------------
function refVal(value){ this.val = value; }

function areaPow2(area)
{
  var x = new refVal(1);
  var y = new refVal(1);
  var inc = x;
  var x_inc = true;

  while (x.val * y.val < area)
  {
    inc = x_inc ? x : y;
    inc.val *= 2;
    x_inc = !x_inc;
  }

  return {w: x.val, h: y.val};
}

function rectPow2(width, height)
{
  return {
    w: Math.pow(2, Math.ceil(Math.log2(width))),
    h: Math.pow(2, Math.ceil(Math.log2(height)))
  };
}
// ------------------------

function pack(quads, texelSize, padding)
{
  // First, get and set the area on the quads
  var totalArea = 0;
  for (var i = 0; i < quads.length; i++)
  {
    quads[i].pixelRect = new rect(0, 0, (quads[i].texMap.w * texelSize) + (2 * padding), (quads[i].texMap.h * texelSize) + (2 * padding));
    totalArea += quads[i].pixelRect.area;
  }

  // Sort in descending order
  var sortedQuads = quads.sort(function(a, b){ return b.pixelRect.area - a.pixelRect.area; });
  var initialWH = areaPow2(totalArea);

  var root = new node();
  root.bounds = new rect(0, 0, initialWH.w, initialWH.h);

  var allFit = true;
  var inc_x = root.bounds.w <= root.bounds.h;
  do {
    for (var i = 0; i < sortedQuads.length; i++)
    {
      allFit = root.insert(sortedQuads[i]);
      if (!allFit)
      {
        // Clear and increment the size
        root.clear();
        root.children = [];
        root.bounds.w = inc_x ? root.bounds.w * 2 : root.bounds.w;
        root.bounds.h = !inc_x ? root.bounds.h * 2 : root.bounds.h;
        inc_x = !inc_x;
        break;
      }
    }
  } while (!allFit);

  root.applyRect();

  return root.bounds;
}

exports.pack = pack;
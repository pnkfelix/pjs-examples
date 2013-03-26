/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function Fake2DParallelArray(w, h, f, ignored) {
    this.width = w;
    this.height = h;
    this.array = new Array(w * h);
    for (var x = 0; x < w; x++) {
      for (var y = 0; y < h; y++) {
            this.array[y*w + x] = f(x, y);
        }
    }
}

Fake2DParallelArray.prototype.flatten = function() { return this; };
Fake2DParallelArray.prototype.getArray = function() { return this.array; };

function reportWriteJx(jx) { divWriteJx("report", jx); }

function reportTiming(variant, d1, d2) {
  reportWriteJx(["div", ["code", variant], " time: "+(d2-d1)+"ms"]);
}

var mouseX = 256;
var mouseY = 0;

function catenate_list() {
  var obj;
  if (this && this.constructor) {
    var ctor = this.constructor;
    obj = new ctor();
  } else
    obj = new Obj();

  function add_all(x) {
    var keys = Object.getOwnPropertyNames(x);
    for (var k in keys) {
      obj[keys[k]] = x[keys[k]];
    }
  }
  function add_from_upto(source, lim) {
    for (var i = 0; i < lim; i++) {
      add_all(source[i]);
    }
  }
  var len = arguments.length;
  add_from_upto(arguments, len-1);
  if (len-1 >= 0) {
    var l = arguments[len-1];
    add_from_upto(l, l.length);
  }
  return obj;
}

function catenate() {
  return catenate_list(arguments);
}

function allkeys(x) {
  var ret = [];
  for (var k in x) {
    ret.push(k);
  }
  return ret;
}

function Obj() {}
Obj.prototype.kind = function Obj_kind() {
  return this.constructor.toSource().match("function ([^\\(]*)\\(")[1];
};
Obj.prototype.content = function Obj_content() { return JSON.stringify(this); };
Obj.prototype.toString = function Obj_toString() { return (this.kind() + this.content()); };
Obj.prototype.toSource =
  function Obj_toSource() { return (this.kind() + ":" + JSON.stringify(this)); };
Obj.prototype.cat =
  function Obj_cat() { return catenate_list.call(this, this, arguments); };

function extend(subclass, superclass) {
  subclass.prototype = new superclass();
  subclass.prototype.constructor = subclass;
}

Number.prototype.eval = function Number_eval() { return this; };
Number.prototype.neg = function Number_neg() { return -this; };
Number.prototype.add = function Number_add(n) { return this+n; };
Number.prototype.sub = function Number_sub(n) { return this-n; };
Number.prototype.mul = function Number_mul(n) { return this*n; };
Number.prototype.div = function Number_div(n) { return this/n; };

// a sum of products representation for more precise numbers
function ArithNum(n) {
  if (arguments.length == 0)
    this.terms = [];
  else
    this.terms = [n,1]; // interp: [a1,b1,a2,b2,...,aN,bN] = a1/b1 + a2/b2 + ... + aN/bN
}

ArithNum.prototype.eval = function ArithNum_eval() {
  // To consider: try divide-and-conquer on the terms to help avoid flonum accum error.
  var ret = 0;
  for (var i=0; i < this.terms.length; i+=2) {
    ret += this.terms[i] / this.terms[i+1];
  }
  return ret;
};
ArithNum.prototype.neg = function () {
  var ret = new ArithNum();
  ret.terms = this.terms.slice(0);
  for (var i=0; i < ret.terms.length; i += 2) {
    ret.terms[i] = -ret.terms[i];
  }
  return ret;
};

function merge_terms(terms1, terms2) {
  // return terms1.concat(terms2);
  var ret = [];
  // alert(JSON.stringify(ret));
  var i = 0, j = 0, k = -2, len1 = terms1.length, len2 = terms2.length;
  while (i < len1 || j < len2) {
    if (k >= 0 && k+1 < ret.length && terms1[i+1] == ret[k+1]) {
      ret[k] += terms1[i];
      i += 2;
      continue;
    }
    if (k >= 0 && k+1 < ret.length && terms2[j+1] == ret[k+1]) {
      ret[k] += terms2[j];
      j += 2;
      continue;
    }
    // they don't match the ret, but they might match each other.
    if (terms1[i+1] == terms2[j+1]) {
      k += 2;
      ret[k]   = terms1[i] + terms2[j];
      ret[k+1] = terms1[i+1];
      i += 2;
      j += 2;
      continue;
    }
    // no one matches, add the lesser denom of the two and move on.
    if (terms1[i+1] < terms2[j+1]) {
      k += 2;
      ret[k]   = terms1[i];
      ret[k+1] = terms1[i+1];
      i += 2;
      continue;
    } else {
      k += 2;
      ret[k]   = terms2[j];
      ret[k+1] = terms2[j+1];
      i += 2;
      continue;
    }
  }
  if (false) {
    alert(JSON.stringify(ret));
    reportWriteJx(["div",
        ["small", " terms1:"+terms1, " terms2:"+terms2, " ret:"+ret]]);
  }
  return ret;
}

ArithNum.prototype.add = function (n) {
  var ret = new ArithNum();
  if (typeof(n) == "number") {
    ret.terms = merge_terms(this.terms, [n,1]);
  } else {
    // presumably its an ArithNum
    ret.terms = merge_terms(this.terms, n.terms);
  }
  return ret;
};

ArithNum.prototype.sub = function (n) {
  var ret;
  if (typeof(n) == "number") {
    ret = new ArithNum();
    ret.terms = merge_terms(this.terms, [-n,1]);
  } else {
    // presumably its an ArithNum
    ret = this.add(n.neg());
  }
  return ret;
};

ArithNum.prototype.mul = function (n) {
  var ret = new ArithNum();
  if (typeof(n) == "number") {
    ret.terms = this.terms.slice(0);
    for (var i=0; i < ret.terms.length; i += 2) {
      ret.terms[i] *= n;
    }
  } else {
    // presumably its an ArithNum
    if (n.terms.length == 2) {
      ret = this.mul(n.terms[0]).div(n.terms[1]);
    } else {
      ret = this.mul(n.eval()); // implementation is weak, and may miss point entirely.
    }
  }
  return ret;
};

ArithNum.prototype.div = function (n) {
  var ret = new ArithNum();
  if (typeof(n) == "number") {
    ret.terms = this.terms.slice(0);
    for (var i=1; i < ret.terms.length; i += 2) {
      ret.terms[i] *= n;
    }
  } else {
    // presumably its an ArithNum
    if (n.terms.length == 2) {
      ret = this.div(n.terms[0]).mul(n.terms[1]);
    } else {
      ret = this.div(n.eval()); // implementation is weak, and may miss point entirely.
    }
  }
  return ret;
};

function Vec(x,y) {
  var argc = arguments.length;
  this.x = (argc > 0) ? x : 0;
  this.y = (argc > 1) ? y : 0;
}

extend(Vec, Obj);

Vec.prototype.content =
  function Vec_content() { return ("("+sigfigs(this.x,2)+","+sigfigs(this.y,2)+")"); };

Vec.prototype.translate = function Vec_translate(dx, dy) {
  return new this.constructor(this.x + dx, this.y + dy);
};

function sqr(x) { return x*x; }

Vec.prototype.mag = function Vec_mag() { return (Math.sqrt(sqr(this.x) + sqr(this.y))); };
Vec.prototype.add = function Vec_add(v) { return this.translate(v.x, v.y); };
Vec.prototype.sub = function Vec_sub(v) { return this.translate(-v.x, -v.y); };
Vec.prototype.mul = function Vec_mul(k) { return (new Vec(this.x*k, this.y*k)); };
Vec.prototype.div = function Vec_div(k) { return (new Vec(this.x/k, this.y/k)); };

function Point(x,y) { return Vec.apply(this, arguments); }
extend(Point, Vec);

function AbsPoint(x, y)    { return Point.call(this, x, y); }
extend(AbsPoint, Point);
function UnitPoint(x, y)   { return Point.call(this, x, y); }
extend(UnitPoint, Point);

function Focus(absPt, vec) {
  this.origin = absPt;
  this.vec = vec;
}
extend(Focus, Obj);

Focus.prototype.width = function() { return Math.abs(this.vec.x); };
Focus.prototype.height = function() { return Math.abs(this.vec.y); };

function CanvasPoint(x, y) { Point.call(this, x, y); }
extend(CanvasPoint, Point);

CanvasPoint.prototype.lineOn = function CanvasPoint_line (c) { return c.lineTo(this.x, this.y); };
CanvasPoint.prototype.moveOn = function CanvasPoint_move (c) { return c.moveTo(this.x, this.y); };

var current_canvas_vec = undefined;
var current_focus = new Focus(new AbsPoint(-1.5,-1), new Vec(2,2));

CanvasPoint.toUnitX = function CanvasPoint_toUnitX(x) {
  var W = current_canvas_vec.x;
  var ux = x / W;
  // var ux = new Number(x).div(W);
  return ux;
};

CanvasPoint.toUnitY = function CanvasPoint_toUnitY(y) {
  var H = current_canvas_vec.y;
  var uy = (H - y) / H;
  // var uy = new Number(H - y).div(H);
  return uy;
};

CanvasPoint.prototype.toUnitPt = function CanvasPoint_toUnitPt() {
  return new UnitPoint(CanvasPoint.toUnitX(this.x), CanvasPoint.toUnitY(this.y));
};

UnitPoint.prototype.toCanvasPt = function UnitPoint_toCanvasPt() {
  var W = current_canvas_vec.x;
  var H = current_canvas_vec.y;
  var cx = this.x * W;
  var cy = H - (this.y * H);
  return new CanvasPoint(cx, cy);
};

CanvasPoint.toAbsX = function CanvasPoint_toAbsX(x, focus) {
  focus = focus || current_focus;
  var nx = CanvasPoint.toUnitX(x);
  return focus.origin.x + nx * focus.width();
};

CanvasPoint.toAbsY = function CanvasPoint_toAbsY(y, focus) {
  focus = focus || current_focus;
  var ny = CanvasPoint.toUnitY(y);
  return focus.origin.y + ny * focus.height();
};

CanvasPoint.prototype.toAbsPt = function CanvasPoint_toAbsPt(focus) {
  return new AbsPoint(CanvasPoint.toAbsX(this.x, focus),
                      CanvasPoint.toAbsY(this.y, focus));
};

AbsPoint.prototype.toCanvasPt = function AbsPoint_toCanvasPt(focus) {
  focus = focus || current_focus;
  var focused_x = (this.x - focus.origin.x) / focus.width();
  var focused_y = (this.y - focus.origin.y) / focus.height();
  var focused = new UnitPoint(focused_x, focused_y);
  return focused.toCanvasPt();
};

var picture;

// the below code is based on a WebCL implementation available at
// http://www.ibiblio.org/e-notes/webcl/mandelbrot.html

var nc = 30;

var sqrad = 150;

// helper function to write the computed picture to a canvas
function writeResult (canvas, picture) {
    var context = canvas.getContext("2d");
    var image = context.createImageData(canvas.width, canvas.height);
    var pix = image.data, c = 0, ic;
    var mbrot = picture.flatten();
    var outBuffer = mbrot.getArray();
    for (var t = 0; t < outBuffer.length; t++) {
        var i = outBuffer[t];
        pix[c++] = i & 0xFF0000;
        pix[c++] = i & 0x00FF00;
        pix[c++] = i & 0x0000FF;
        pix[c++] = 255;
    }
    context.putImageData(image, 0, 0);

    context.beginPath();
    context.strokeStyle = "green";
    context.lineWidth = 5;
    // context.arc(mouseX, mouseY, 20, (Math.PI/180)*0, (Math.PI/180)*360, false);
    var mul = new CanvasPoint(mouseX - sqrad, mouseY - sqrad);
    var mur = new CanvasPoint(mouseX + sqrad, mouseY - sqrad);
    var mbl = new CanvasPoint(mouseX - sqrad, mouseY + sqrad);
    var mbr = new CanvasPoint(mouseX + sqrad, mouseY + sqrad);

    var cul = mul.toAbsPt();
    var cur = mur.toAbsPt();
    var cbl = mbl.toAbsPt();
    var cbr = mbr.toAbsPt();

    var gul = (new CanvasPoint(0,            0)).toAbsPt();
    var gur = (new CanvasPoint(canvas.width, 0)).toAbsPt();
    var gbl = (new CanvasPoint(0,            canvas.height)).toAbsPt();
    var gbr = (new CanvasPoint(canvas.width, canvas.height)).toAbsPt();

    mul.moveOn(context);
    mur.lineOn(context);
    mbr.lineOn(context);
    mbl.lineOn(context);
    mul.lineOn(context);
    context.stroke();
    context.closePath();

  if (false) {
    context.beginPath();
    context.strokeStyle = "blue";
    context.lineWidth = 3;
    context.moveTo(mouseX-sqrad, mouseY-sqrad);
    context.lineTo(mouseX, mouseY);
    context.stroke();
    context.closePath();

    context.font = "8px monaco";

    context.fillStyle = "#FFFFFF";
    context.fillText("ul:"+mul, mul.x+3, mul.y+20);
    context.fillText("ur:"+mur, mur.x-137, mur.y+20);
    context.fillText("bl:"+mbl, mbl.x+3, mbl.y-17);
    context.fillText("br:"+mbr, mbr.x-137, mbr.y-17);
    context.fillStyle = "#FFFF00";
    context.fillText("ul:"+cul, mul.x+3, mul.y+30);
    context.fillText("ur:"+cur, mur.x-137, mur.y+30);
    context.fillText("bl:"+cbl, mbl.x+3, mbl.y-27);
    context.fillText("br:"+cbr, mbr.x-137, mbr.y-27);

    context.fillStyle = "#00FF00";
    context.fillText("ul:"+gul, gul.toCanvasPt().x+3,   gul.toCanvasPt().y+10);
    context.fillText("ur:"+gur, gur.toCanvasPt().x-127, gur.toCanvasPt().y+10);
    context.fillText("bl:"+gbl, gbl.toCanvasPt().x+3,   gbl.toCanvasPt().y-7);
    context.fillText("br:"+gbr, gbr.toCanvasPt().x-127, gbr.toCanvasPt().y-7);
  }
}

var circles =
  [{r: 30, x:   0, y:   0, c:0x000FFF},
   {r: 40, x:-201, y:  10, c:0x00000F},
   {r: 40, x: 142, y: 100, c:0x0000FF},
   {r: 30, x:-103, y: 200, c:0x000FFF},
   {r: 30, x:-203, y:-100, c:0x000FFF},
   {r: 20, x: 204, y:-250, c:0x00FFFF},
   {r: 45, x: 205, y:  50, c:0x0FF0FF},
   {r: 45, x: 105, y:  50, c:0x0FF0FF},
   {r: 45, x:  25, y:  50, c:0x0FF0FF},
   {r: 10, x: -16, y:150, c:0xF0FF0F}
  ];

function insideP(x, y, c) {
  return sqr(c.x - x) + sqr(c.y - y) < sqr(c.r);
}

function itercountToColor(n) {
  if (colorMap) return colorMap[n];

  var block = 0xFFF;
  var chip_0 = n & 0x00007;
  var chip_1 = n & 0x00038;
  var chip_2 = n & 0x001C0;
  var chip_3 = n & 0x00E00;
  var chip_4 = n & 0x07000;
  var chip_5 = n & 0x38000;

  var offset_0 =   6;
  var offset_1 =  -3;
  var offset_2 =   0;
  var offset_3 =   0;
  var offset_4 = -12;
  var offset_5 =   0;
  return ((n & chip_0 << offset_0) |
          (n & chip_1 << offset_1) |
          (n & chip_2 << offset_2) |
          (n & chip_3 << offset_3) |
          (n & chip_4 << offset_4) |
          (n & chip_5 << offset_5) );
}

var maxIters = 256*4;

var colorMap = undefined;
function buildColorMap(maxIters) {
  colorMap = undefined;
  var cMap = new Array;
  for (var i = 0; i < maxIters+1; i++) {
    cMap[i] = itercountToColor(i);
  }
  colorMap = cMap;
}

function kernel(x, y) {
  if (false) for (var i = 0; i < circles.length; i++) {
    if (insideP(p_x, p_y, circles[i])) return circles[i].c;
  }
  var p_x = CanvasPoint.toAbsX(x);
  var p_y = CanvasPoint.toAbsY(y);
  var Cr = p_x;
  var Ci = p_y;
  var I=0, R=0, I2=0, R2=0;
  var n=0;
  while ( (R2+I2 < 2.0) && (n < maxIters) ){
    I = (R+R)*I+Ci; R=R2-I2+Cr;  R2=R*R;  I2=I*I;  n++;
  }
  return itercountToColor(n);
}

function getCanvasHtm() {
  var canvas = document.getElementById("canvasHtm");
  if (!current_canvas_vec
      || current_canvas_vec.x != canvas.width
      || current_canvas_vec.y != canvas.height) {
    current_canvas_vec = new Vec(canvas.width, canvas.height);
  }
  return canvas;
}

function renderHtm() {
    var canvas = getCanvasHtm();
    var d1 = new Date();
    var mode = "html";
    picture =
      new Fake2DParallelArray(canvas.width, canvas.height, function (x,y) {
        return kernel(x, y); }, { mode: mode, expect: "any" } );
    var d2 = new Date();
    writeResult(canvas, picture);
    reportTiming("Htm", d1, d2);
    return (d2 - d1);
}

function sigfigs(x, decimals) {
    var integ = x | 0;
    var frac  = x - integ;
    var scale = Math.pow(10, decimals);
    var cutoff =  Math.floor(frac * scale) / scale;
    var suffix = (""+cutoff).substring(integ < 0 ? 3 : 2);
    while (suffix.length < decimals)
        suffix = suffix + "0";
    return integ + "." + suffix;
}

function render() {
    var htmTime = renderHtm();
    // divWriteJx("kernelsource", ['pre', ""+computeSet]);
}

function pageload() {
    buildColorMap(maxIters);
    render();
    var canvas = getCanvasHtm();
    canvas.addEventListener("mousemove", onMouseMove, false);
    canvas.addEventListener("click", onMouseClick, false);
}

function onMouseMove(e) {
    var canvas = getCanvasHtm();
    mouseX = e.clientX - canvas.offsetLeft;
    mouseY = e.clientY - canvas.offsetTop;
    // render();
    writeResult(canvas, picture);
}

function onMouseClick(e) {
    var canvas = getCanvasHtm();
    mouseX = e.clientX - canvas.offsetLeft;
    mouseY = e.clientY - canvas.offsetTop;
    var cbl = new CanvasPoint(mouseX - sqrad, mouseY + sqrad);
    var cur = new CanvasPoint(mouseX + sqrad, mouseY - sqrad);
    var new_focus = new Focus(cbl.toAbsPt(), cur.toAbsPt().sub(cbl.toAbsPt()));
    current_focus = new_focus;
    render();
    reportWriteJx(["div",
      ["small", " cbl:"+cbl, " cur:"+cur, " new_focus:"+new_focus]]);
}

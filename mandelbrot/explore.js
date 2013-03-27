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
function reportResetOutput() { divResetJx("report"); }

function reportTiming(variant, d1, d2) {
  reportWriteJx(["div", ["code", variant],
                 " maxIters: "+maxIters,
                 " time: "+(d2-d1)+"ms"]);
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
Obj.prototype.content = function Obj_content() JSON.stringify(this);
Obj.prototype.toString = function Obj_toString() (this.kind() + this.content());
Obj.prototype.toSource =
  function Obj_toSource() (this.kind() + ":" + JSON.stringify(this));
Obj.prototype.cat =
  function Obj_cat() { return catenate_list.call(this, this, arguments); };

function Vec(x,y) {
  var argc = arguments.length;
  this.x = (argc > 0) ? x : 0;
  this.y = (argc > 1) ? y : 0;
}

function extend(subclass, superclass) {
  subclass.prototype = new superclass();
  subclass.prototype.constructor = subclass;
}

extend(Vec, Obj);

Vec.prototype.content =
  function Vec_content() ("("+sigfigs(this.x,2)+","+sigfigs(this.y,2)+")");

Vec.prototype.translate = function Vec_translate(dx, dy) {
  return new this.constructor(this.x + dx, this.y + dy);
};

function sqr(x) { return x*x; }

Vec.prototype.mag = function Vec_mag() (Math.sqrt(sqr(this.x) + sqr(this.y)));
Vec.prototype.add = function Vec_add(v) this.translate(v.x, v.y);
Vec.prototype.sub = function Vec_sub(v) this.translate(-v.x, -v.y);
Vec.prototype.mul = function Vec_mul(k) (new Vec(this.x*k, this.y*k));
Vec.prototype.div = function Vec_div(k) (new Vec(this.x/k, this.y/k));

function Point(x,y) Vec.apply(this, arguments);

extend(Point, Vec);

function AbsPoint(x, y)    Point.call(this, x, y);
extend(AbsPoint, Point);
function UnitPoint(x, y)   Point.call(this, x, y);
extend(UnitPoint, Point);

function Focus(absPt, vec) {
  this.origin = absPt;
  this.vec = vec;
}
extend(Focus, Obj);

Focus.prototype.width = function() Math.abs(this.vec.x);
Focus.prototype.height = function() Math.abs(this.vec.y);

function CanvasPoint(x, y) { Point.call(this, x, y); }
extend(CanvasPoint, Point);

CanvasPoint.prototype.lineOn = function CanvasPoint_line (c) c.lineTo(this.x, this.y);
CanvasPoint.prototype.moveOn = function CanvasPoint_move (c) c.moveTo(this.x, this.y);

var current_canvas_vec = undefined;
var current_focus = new Focus(new AbsPoint(-1.5,-1), new Vec(2,2));

CanvasPoint.toUnitX = function CanvasPoint_toUnitX(x) {
  var W = current_canvas_vec.x;
  var ux = x / W;
  return ux;
};

CanvasPoint.toUnitXscaled = function CanvasPoint_toUnitX(x, scaleBy) {
  var W = current_canvas_vec.x;
  var ux = x * (scaleBy / W);
  return ux;
};

CanvasPoint.toUnitY = function CanvasPoint_toUnitY(y) {
  var H = current_canvas_vec.y;
  var uy = (H - y) / H;
  return uy;
};

CanvasPoint.toUnitYscaled = function CanvasPoint_toUnitY(y, scaleBy) {
  var H = current_canvas_vec.y;
  var uy = (H - y) * (scaleBy / H);
  return uy;
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
  var nx = CanvasPoint.toUnitXscaled(x, focus.width());
  return focus.origin.x + nx;
};

CanvasPoint.toAbsY = function CanvasPoint_toAbsY(y, focus) {
  focus = focus || current_focus;
  var ny = CanvasPoint.toUnitYscaled(y, focus.height());
  return focus.origin.y + ny;
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
   {r: 10, x: -16, y: 150, c:0xF0FF0F}
  ];

function insideP(x, y, c) {
  return sqr(c.x - x) + sqr(c.y - y) < sqr(c.r);
}

function itercountToColor(n) {
  if (n == maxIters) return 0;
  n = (n % maxColorMapSize);

  if (colorMap) return colorMap[n];

  var n0 = (n & (0xF <<  0)) >>  0;
  var n1 = (n & (0xF <<  4)) >>  4;
  var n2 = (n & (0xF <<  8)) >>  8;
  var n3 = (n & (0xF << 12)) >> 12;

  var s0 = (n0);// & ((n <= 0xF) ? 0xF : 0x0) ;
  var s1 = (n1 ^ s0);// & ((n <= 0xFF) ? 0xF : 0x0) ;
  var s2 = (n2 ^ s1);// & ((n <= 0xFFF) ? 0xF : 0x0) ;
  var s3 = (n3 ^ s2) & 0xF;

  var c0 = ((s0 & 0x1 << 0) |
            (s0 & 0x2 << 7) |
            (s0 & 0xC << 14));

  var c1 = ((n1 & 0x1 << 0)  |
            (n1 & 0x2 << 7) |
            (n1 & 0xC << 14));

  var c2 = ((n2 & 0x1 << 0) |
            (n2 & 0x2 << 7) |
            (n2 & 0xC << 14));

  var c3 = ((n3 & 0x1 << 0)  |
            (n3 & 0x2 << 7) |
            (n3 & 0xC << 14));

  var ret = (c0 <<  7 |
             c1 << 14 |
             c2 << 21 |
             c3 <<  0);

  // colorMap[n] = ret;
  return ret;
}

var hitMaxRedrawTime = false;
var maxItersBound = 256 * 256 * 16;
var maxItersStart = 64;
var maxIters = maxItersStart;

var maxColorMapSize = 256 * 256;

var colorMap = undefined;
function needBiggerColorMap() {
  return Math.min(maxColorMapSize, maxIters+1 > colorMap.length);
}

function buildColorMap(maxIters) {
  colorMap = undefined;
  var cMap = new Array;
  var lim = Math.min(maxColorMapSize, maxIters+1);
  for (var i = 0; i < lim; i++) {
    cMap[i] = itercountToColor(i);
  }
  colorMap = cMap;
}

function kernel(x, y) {
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

function iterate_step1() {
  enqueuedIterate = false;
  if (!hitMaxRedrawTime && maxIters < maxItersBound) {
    var d1 = new Date();
    maxIters = maxIters << 1;
    if (needBiggerColorMap()) {
      buildColorMap(maxIters);
    }
    var d2 = new Date();
    if (d2 - d1 > 4000) {
      window.setTimeout(iterate_step2, 10);
    } else {
      iterate_step2_rest(d1);
    }
  }
}

function iterate_step2() {
  var d1 = new Date();
  iterate_step2_rest(d1);
}

function iterate_step2_rest(d1) {
  redraw();
  var d2 = new Date();
  if ((d2 - d1) > 5000) {
    hitMaxRedrawTime = true;
    reportWriteJx("hit max redraw time: " + (d2 - d1)/1000 + "s");
  }
  establishPeriodicRefinement();
}

var enqueuedIterate = false;
function establishPeriodicRefinement() {
  if (enqueuedIterate) return;
  window.setTimeout(iterate_step1, 1000);
  enqueuedIterate = true;
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
    // buildColorMap(maxIters);
    buildColorMap(maxColorMapSize);
    redraw();
    var canvas = getCanvasHtm();
    canvas.addEventListener("mousemove", onMouseMove, false);
    canvas.addEventListener("click", onMouseClick, false);
    establishPeriodicRefinement();
}

function onMouseMove(e) {
    var canvas = getCanvasHtm();
    mouseX = e.clientX - canvas.offsetLeft;
    mouseY = e.clientY - canvas.offsetTop;
    // redraw();
    writeResult(canvas, picture);
}

function resetRefinement() {
  hitMaxRedrawTime = false;
  // if (maxIters >= maxItersBound) {
    establishPeriodicRefinement();
  // }
  maxIters = maxItersStart;
  reportResetOutput();
}

function redraw() {
    render();
}

function onMouseClick(e) {
    var canvas = getCanvasHtm();
    mouseX = e.clientX - canvas.offsetLeft;
    mouseY = e.clientY - canvas.offsetTop;
    var cbl = new CanvasPoint(mouseX - sqrad, mouseY + sqrad);
    var cur = new CanvasPoint(mouseX + sqrad, mouseY - sqrad);
    var new_focus = new Focus(cbl.toAbsPt(), cur.toAbsPt().sub(cbl.toAbsPt()));
    current_focus = new_focus;
    resetRefinement();
    reportWriteJx(["code", "focus:"+current_focus]);
    redraw();
}

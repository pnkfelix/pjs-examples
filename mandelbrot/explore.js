/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// the below code is based on a WebCL implementation available at
// http://www.ibiblio.org/e-notes/webcl/mandelbrot.html

function itercountToColor(n) {
  if (n == maxIters) return 0x0;
  n = (n % (maxColorMapSize-1))+1;

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

function pageload() {
    // buildColorMap(maxIters);
    buildColorMap(maxColorMapSize);
    redraw();
    var canvas = getCanvasHtm();
    canvas.addEventListener("mousemove", onMouseMove, false);
    canvas.addEventListener("click", onMouseClick, false);
    window.addEventListener("keydown", onKey, true);
    establishPeriodicRefinement();
}

function onKey(e) {
  reportWriteJx(["code", "key "+e.keyCode]);
  switch (e.keyCode) {
    case 173: zoomOut(); resetRefinement(); redraw();
  }
}

function resetRefinement() {
  hitMaxRedrawTime = false;
  // if (maxIters >= maxItersBound) {
    establishPeriodicRefinement();
  // }
  maxIters = maxItersStart;
  reportResetOutput();
}

function onMouseClick(e) {
    var canvas = getCanvasHtm();
    mouseX = e.clientX - canvas.offsetLeft;
    mouseY = e.clientY - canvas.offsetTop;
    var ctl = new CanvasPoint(mouseX - sqrad, mouseY - sqrad);
    var ctr = new CanvasPoint(mouseX + sqrad, mouseY - sqrad);
    var cbl = new CanvasPoint(mouseX - sqrad, mouseY + sqrad);
    var cbr = new CanvasPoint(mouseX + sqrad, mouseY + sqrad);
    var new_focus = new Focus(cbl.toAbsPt(), ctr.toAbsPt().sub(cbl.toAbsPt()));
    current_focus = new_focus;
    resetRefinement();
    reportWriteJx(["code", "focus:"+current_focus]);
    redraw();
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var circles =
  [
   {r: 0.30, x:     0, y:     0, c:0x000011},
   {r: 0.40, x:-1.301, y:  0.20, c:0x022070},
   {r: 0.40, x: 0.742, y: 0.200, c:0x030000},
   {r: 0.30, x:-1.503, y: 0.400, c:0x004000},
   {r: 0.30, x:-1.303, y:-0.200, c:0x000055},
   {r: 0.20, x: 0.304, y:-0.550, c:0x000606},
   {r: 0.45, x: 0.405, y:  0.90, c:0xFFFFFF},
   {r: 1.05, x: 0.205, y:  0.90, c:0x7F0F00},
   {r: 1.45, x:  0.45, y:  1.90, c:0x009909},
   {r: 0.10, x:  0.00, y:  1.00, c:0xAA00AA}
  ];

function insideP(x, y, c) {
  return sqr(c.x - x) + sqr(c.y - y) < sqr(c.r);
}

function kernel(x, y) {
  var cp = new CanvasPoint(x,y);
  var ap = cp.toAbsPt();
  var p_x = ap.x;
  var p_y = ap.y;
  //var p_x = CanvasPoint.toAbsX(x);
  //var p_y = CanvasPoint.toAbsY(y);
  var Cr = p_x;
  var Ci = p_y;
  var I=0, R=0, I2=0, R2=0;
  var n=0;
  for (var i=0; i < circles.length; i++) {
    if (insideP(p_x, p_y, circles[i]))
      return circles[i].c;
  }
  return 0;
}

function pageload() {
    // buildColorMap(maxIters);
    // buildColorMap(maxColorMapSize);
    redraw();
    var canvas = getCanvasHtm();
    canvas.addEventListener("mousemove", onMouseMove, false);
    canvas.addEventListener("click", onMouseClick, false);
    window.addEventListener("keydown", onKey, true);
    // establishPeriodicRefinement();
}

function onKey(e) {
  reportWriteJx(["code", "key "+e.keyCode]);
  switch (e.keyCode) {
    case 173: zoomOut();
        // resetRefinement();
        redraw();
  }
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
    // resetRefinement();
    reportWriteJx(["code", "focus:"+current_focus]);
    redraw();
}

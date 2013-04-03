/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

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
  var side = ((p_x ^ ~p_y) & ((p_y - 350) >> 3));
  var f = side*side;
  var val = (f >> 12) & 1;
  var ret = val ? 0xFFFFFF : 0x0;
  return ret;
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

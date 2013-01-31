/* -*- Mode: js; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*- */
/*
 * Copyright (c) 2011, Intel Corporation
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice, 
 *   this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice, 
 *   this list of conditions and the following disclaimer in the documentation 
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE 
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF 
 * THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

ParallelArray.prototype.getArray =
    function () {
        var len = this.length;
        var ret = new Array(len);
        for (var i = 0; i < len; i++) {
            ret[i] = this.get(i);
        }
        return ret;
    };

function Fake2DParallelArray(w, h, f, ignored) {
    this.width = w;
    this.height = h;
    this.array = new Array(w * h);
    for (var x = 0; x < w; x++) {
        for (var y = 0; y < h; y++) {
            this.array[x*h + y] = f(x, y);
        }
    }
}

Fake2DParallelArray.prototype.flatten = function() { return this; }
Fake2DParallelArray.prototype.getArray = function() { return this.array; }


// the below code is based on a WebCL implementation available at
// http://www.ibiblio.org/e-notes/webcl/mandelbrot.html

var nc = 30, maxCol = nc*3, cr,cg,cb;

// initialises the color map for translating Mandelbrot iterations
// into nice colors
function computeColorMap() {
   var st = 255/nc;
   cr = new Array(maxCol); cg = new Array(maxCol); cb = new Array(maxCol);
   for (var i = 0; i < nc; i++){
     var d = Math.floor(st*i);
     cr[i] = 255 - d;  cr[i+nc] = 0;  cr[i+2*nc] = d;
     cg[i] = d;  cg[i+nc] = 255 - d;  cg[i+2*nc] = 0;
     cb[i] = 0;  cb[i+nc] = d;  cb[i+2*nc] = 255 - d;
   }
   cr[maxCol] = cg[maxCol] = cb[maxCol] = 0;
}

// this is the actual mandelbrot computation, ported to JavaScript
// from the WebCL / OpenCL example at 
// http://www.ibiblio.org/e-notes/webcl/mandelbrot.html
function computeSet(x, y, scale) {
    var Cr = (x - 256) / scale + 0.407476;
    var Ci = (y - 256) / scale + 0.234204;
    var I = 0, R = 0, I2 = 0, R2 = 0;
    var n = 0;
    while ((R2+I2 < 2.0) && (n < 512)) {
       I = (R+R)*I+Ci;
       R = R2-I2+Cr;
       R2 = R*R;
       I2 = I*I;
       n++;
    } 
    return n;
}

// helper function to write the result of computing the mandelbrot
// set to a canvas
function writeResult (canvas, mandelbrot) {
    var context = canvas.getContext("2d");
    var image = context.createImageData(512, 512);
    var pix = image.data, c = 0, ic;
    var mbrot = mandelbrot.flatten();
    var outBuffer = mbrot.getArray();
    for (var t = 0; t < 512*512; t++) {
        var i = outBuffer[t];
        if (i == 512) ic = maxCol;
        else ic = i % maxCol;
        pix[c++] = cr[ic];  
        pix[c++] = cg[ic];  
        pix[c++] = cb[ic];  
        pix[c++] = 255;
    }
    context.putImageData(image, 0, 0);
}


function reportWriteJx(jx) { divWriteJx("report", jx); }

function reportTiming(variant, d1, d2) {
    reportWriteJx(["div", ["code", variant], " time: "+ (d2-d1) +"ms"]);
}

function coreRender(kind) {
    var canvas = document.getElementById("canvas" + kind);
    var scale = 10000*300;
    computeColorMap();
    var d1 = new Date();
    var mode = (kind == "Par") ? "par" : "seq";
    var mandelbrot = new ParallelArray([512,512], function (x,y) { return computeSet(x, y, scale); }, { mode: mode, expect: "any" } );
    var d2 = new Date();
    writeResult(canvas, mandelbrot);
    reportTiming(kind, d1, d2);
    return (d2 - d1);
}

function renderHtm() {
    var canvas = document.getElementById("canvasHtm");
    var scale = 10000*300;
    computeColorMap();
    var d1 = new Date();
    var mode = "html";
    var mandelbrot = new Fake2DParallelArray(512,512, function (x,y) { return computeSet(x, y, scale); }, { mode: mode, expect: "any" } );
    var d2 = new Date();
    writeResult(canvas, mandelbrot);
    reportTiming("Htm", d1, d2);
    return (d2 - d1);
}

function renderPar () { return coreRender("Par"); }

function renderSeq () { return coreRender("Seq"); }

function sigfigs(x, decimals) {
    var integ = x | 0;
    var frac  = x - integ;
    var scale = Math.pow(10, decimals);
    var cutoff =  Math.floor(frac * scale) / scale;
    var suffix = (""+cutoff).substring(2);
    while (suffix.length < decimals)
        suffix = suffix + "0";
    return integ + "." + suffix;
}

function render() {
    var parTime = renderPar();
    var seqTime = renderSeq();
    var htmTime = renderHtm();

    reportWriteJx(['p', "speedup (seq time/par time): " + sigfigs(seqTime/parTime, 2)]);
    divWriteJx("kernelsource", ['pre', ""+computeSet]);
}

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

/**
The algorithm used in this example is based on the following paper, which also appeared in
ACM SIGGRAPH 2007.
Shai Avidan and Ariel Shamir. 2007. Seam carving for content-aware image resizing. 
ACM Trans. Graph. 26, 3, Article 10 (July 2007). 
DOI=10.1145/1276377.1276390 http://doi.acm.org/10.1145/1276377.1276390
**/

var reduceOneHorizontalJS, reduceOneVerticalJS;
var reduceManyHorizontalJS, reduceManyVerticalJS;

(function () {

function newArray(nrows, ncols) {
    var a = new Array(nrows);
    for (var i = 0; i < nrows; i++) {
        a[i] = new Array(ncols);
    }
    return a;
}

// Find first index of a pixel in the data array

function grayScaleJS(buf, context) {
    var buf1 = context.createImageData(buf.width, buf.height);
    var data = buf.data;
    var data1 = buf1.data;

    var i;
    for (i = 0; i < data.length; i+=4) {
        var r = data[i];
        var g = data[i+1];
        var b = data[i+2];
        var lum = (0.299*r + 0.587*g + 0.114*g);
        data1[i] = lum;
        data1[i+1] = lum;
        data1[i+2] = lum;
        data1[i+3] = 255;
    }
    return buf1;
}

// Edge detection; returns data with detected edges

function detectEdgesJS(buf, context) {
    var data = buf.data;
    var buf1 = context.createImageData(buf.width, buf.height);
    var data1 = buf1.data;
    var sobelX =  [[-1.0,  0.0, 1.0],
                    [-2.0, 0.0, 2.0],
                    [-1.0, 0.0, 1.0]];
    var sobelY = [[1.0,  2.0, 1.0],
                    [0.0, 0.0, 0.0],
                    [-1.0, -2.0, -1.0]];

    var height = buf.height;
    var width = buf.width;

    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            // process pixel
            var totalX = 0;
            var totalY = 0;
            for (var offY = -1; offY <= 1; offY++) {
                var newY = y + offY;
                for (var offX = -1; offX <= 1; offX++) {
                    var newX = x + offX;
                    if ((newX >= 0) && (newX < width) && (newY >= 0) && (newY < height)) {
                        var pointIndex = (x + offX + (y + offY) * buf.width) * 4;
                        var e = data[pointIndex];
                        totalX += e * sobelX[offY + 1][offX + 1];
                        totalY += e * sobelY[offY + 1][offX + 1];
                    }
                }
            }
            var total = Math.floor((Math.abs(totalX) + Math.abs(totalY))/8.0);
            var index = (x + y * buf.width) * 4;
            data1[index] = total;
            data1[index+1] = total;
            data1[index+2] = total;
            data1[index+3] = 255;
        }
    }
    return buf1;
}

// Compute energy and return an array
  
function computeEnergyJS(buf) {
    var height = buf.height;
    var width = buf.width;
    var energy = newArray(height, width);
    energy[0][0] = 0;
    var data = buf.data;
    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var e = data[(x + y * buf.width) * 4];

            // find min of energy above
            if (y >= 1) {
                var p = energy[y-1][x];
                if (x > 0 && energy[y - 1][x - 1] < p) {
                    p = energy[y - 1][x - 1];
                }
                if (x < (width - 1) && energy[y - 1][x + 1] < p) {
                    p = energy[y - 1][x + 1];
                }
                e += p;
            }
            energy[y][x] = e;
        }
    }
    return energy;
}

function findPathJS(energy) {
    var height = energy.length;
    var width = energy[0].length;
    var path = new Array(height);
    var y = height - 1;
    var minPos = 0;
    var minEnergy = energy[y][minPos];

    for (var x = 1; x < width; x++) {
        if (energy[y][x] < minEnergy) {
            minEnergy = energy[y][x];
            minPos = x;
        }
    }
    path[y] = minPos;
    for (y = height - 2; y >=0; y--) {
        minEnergy = energy[y][minPos];
        var line = energy[y];
        var p = minPos;
        if (p >= 1 && line[p-1] < minEnergy) {
            minPos = p-1; minEnergy = line[minPos];
        }
        if (p < width - 1 && line[p+1] < minEnergy) {
            minPos = p+1; minEnergy = line[minPos];
        }
        path[y] = minPos;
    }
    return path;
}

/* cut path from the image data */

function cutPathHorizontallyJS(buf, path) {
    var height = buf.height;
    var width = buf.width;
    var data = buf.data;
    var y;
    for (y = 0; y < height; y++) { // for all rows
        var cutX = path[y];
        var blendX = (cutX == 0 ? cutX + 1 : cutX - 1);
        var cutIndex = (cutX + y * buf.width) * 4; // getPixelIndex(cutX, y);
        var blendIndex = (blendX + y * buf.width) * 4; //getPixelIndex(blendX, y);
        data[cutIndex] = (data[cutIndex] + data[blendIndex])/2;
        data[cutIndex+1] = (data[cutIndex+1] + data[blendIndex+1])/2;
        data[cutIndex+2] = (data[cutIndex+2] + data[blendIndex+2])/2;
    
        var lastIndex = (width - 2 + y * buf.width) * 4; // getPixelIndex(width - 2, y);

        for (var i = cutIndex + 4; i < lastIndex; i += 4) {
            data[i] = data[i+4];
            data[i+1] = data[i+5];
            data[i+2] = data[i+6];
        }
    
        lastIndex += 4; // last pixel in a row
        data[lastIndex] = data[lastIndex + 1] = data[lastIndex + 2] = 0;  
    }

    return buf;
}

function cutPathVerticallyJS(buf, path) {
    var height = buf.height;
    var width = buf.width;
    var rowStride = width * 4;
    var data = buf.data;
    var x;
    for (x = 0; x < width; x++) { // for all cols
        var cutY = path[x];
        var blendY = (cutY == 0 ? cutY + 1 : cutY - 1);
        var cutIndex = (x + cutY * buf.width) * 4; //getPixelIndex(x, cutY);
        var blendIndex = (x + blendY * buf.width) * 4; //getPixelIndex(x, blendY);
        data[cutIndex] = (data[cutIndex] + data[blendIndex])/2;
        data[cutIndex+1] = (data[cutIndex+1] + data[blendIndex+1])/2;
        data[cutIndex+2] = (data[cutIndex+2] + data[blendIndex+2])/2;
    
        var lastIndex = (x + (height - 2) * buf.width) * 4; //getPixelIndex(x, height - 2);

        for (var i = cutIndex + rowStride; i < lastIndex; i += rowStride) {
            data[i] = data[i+rowStride];
            data[i+1] = data[i+rowStride+1];
            data[i+2] = data[i+rowStride+2];
        }
    
        lastIndex += rowStride; // last pixel in a column
        data[lastIndex] = data[lastIndex+1] = data[lastIndex + 2] = 0;
    }

    return buf;
}

function transposeJS(buf, context) {
    var buf1 = context.createImageData(buf.height, buf.width);
    var data = buf.data;
    var data1 = buf1.data;
    var ypos = 0;
    for (var y = 0; y < buf.height; y++) {
        for (var x = 0; x < buf.width; x++) {
            data1[x*buf1.width*4 + y*4] = data[y*buf.width*4 + x*4];
            data1[x*buf1.width*4 + y*4 +1] = data[y*buf.width*4 + x*4 +1];
            data1[x*buf1.width*4 + y*4 +2] = data[y*buf.width*4 + x*4 +2];
            data1[x*buf1.width*4 + y*4 +3] = data[y*buf.width*4 + x*4 +3];
        }
        //ypos += buf.width*4;
    }

    return buf1;
}

   stages = new Array(7);
   function clearStages() {
     for (var i = 0; i < stages.length; i++) {
       stages[i] = 0;
     }
   }

   function reduceOneCore(context, transform, cutPath) {
     var buf_orig = context.getImageData(0, 0, virtualWidth, virtualHeight);
     var t_start = new Date();
     var buf = transform(buf_orig);
     var t_transform01 = new Date();
     var gray = grayScaleJS(buf, context);
     var t_grayscale02 = new Date();
     var edges = detectEdgesJS(gray, context);
     var t_detectedges03 = new Date();
     var t_end = t_detectedges03;
     parallelComponentTime += (t_end - t_start);
     var energy = computeEnergyJS(edges);
     var t_computeenergy04 = new Date();
     var path = findPathJS(energy);
     var t_findpath05 = new Date();
     var image = cutPath(buf_orig, path);
     var t_cutpath06 = new Date();
     context.putImageData(image, 0, 0);

     stages[1] += t_transform01 - t_start;
     stages[2] += t_grayscale02 - t_transform01;
     stages[3] += t_detectedges03 - t_grayscale02;
     stages[4] += t_computeenergy04 - t_detectedges03;
     stages[5] += t_findpath05 - t_computeenergy04;
     stages[6] += t_cutpath06 - t_findpath05;
   };

   reduceOneHorizontalJS = function reduceOneHorizontalJS(canvas) {
     var context = canvas.getContext("2d");
     function id(pa) { return pa; }
     reduceOneCore(context, id, cutPathHorizontallyJS);
   };

   reduceOneVerticalJS = function reduceOneVerticalJS(canvas) {
    var context = canvas.getContext("2d");
     function flip(pa) { return transposeJS(pa, context); }
     reduceOneCore(context, flip, cutPathVerticallyJS);
   };

   var callCount = 0;
   reduceManyHorizontalJS = function reduceManyHorizontalJS(canvas, reps, callback) {
     clearStages();
     for (var i = 0; i < reps; i++) {
         reduceOneHorizontalJS(canvas);
         callback();
     }

     callCount++;
     addLogMessage("Hello " + callCount + " " + JSON.stringify(stages) + " from reduceManyHorizontalJS");
   };

   reduceManyVerticalJS = function reduceManyVerticalJS(canvas, reps, callback) {
     clearStages();
     for (var i = 0; i < reps; i++) {
         reduceOneVerticalJS(canvas);
         callback();
     }

     callCount++;
     addLogMessage("Hello " + callCount + " " + JSON.stringify(stages) + " from reduceManyVerticalJS");
   };

})();

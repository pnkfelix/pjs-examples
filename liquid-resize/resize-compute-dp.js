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

function newArray(nrows, ncols) {
    var a = new Array(nrows);
    for (var i = 0; i < nrows; i++) {
        a[i] = new Array(ncols);
    }
    return a;
}

function grayScalePA(inPA) {
  // var grayPA = inPA.combine(2, low_precision(grayKernel));
  var grayPA = new ParallelArray([inPA.shape[0], inPA.shape[1]],
                                 function (i,j) {
                                   var r = inPA.get(i,j,0);
                                   var g = inPA.get(i,j,1);
                                   var b = inPA.get(i,j,2);
                                   var lum = 0.299 * r + 0.587 * g + 0.114 * b;
                                   return lum;
                                 });
  return grayPA;
}

// Edge detection; returns data with detected edges

function detectEdgesPA(grayPA) {

    var sobelX =  [[-1.0,  0.0, 1.0],
                    [-2.0, 0.0, 2.0],
                    [-1.0, 0.0, 1.0]];
    var sobelY = [[1.0,  2.0, 1.0],
                    [0.0, 0.0, 0.0],
                    [-1.0, -2.0, -1.0]];

    var height = grayPA.shape[0];
    var width = grayPA.shape[1];

        function edgeKernelCalc(y, x) {
            var totalX = 0;
            var totalY = 0;

            for (var offY = -1; offY <= 1; offY++) {
                var newY = y + offY;
                for (var offX = -1; offX <= 1; offX++) {
                    var newX = x + offX;
                    if ((newX >= 0) && (newX < width) && (newY >= 0) && (newY < height)) {
                        var e = grayPA.get(newY, newX);
                        totalX += e * sobelX[offY + 1][offX + 1];
                        totalY += e * sobelY[offY + 1][offX + 1];
                    }
                }
            }

            var total = Math.floor((Math.abs(totalX) + Math.abs(totalY)) / 8.0);
            return total;
        }

    var edgePA = new ParallelArray(grayPA.shape, edgeKernelCalc);
    return edgePA;

}

function computeEnergyPA(inPA) {
  var height = inPA.shape[0];
  var width = inPA.shape[1];
  var energy = newArray(height, width);
  energy[0][0] = 0;
  for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        // var e = data[y*width + x]; 
        var e = inPA.get(y, x);

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

function findPathPA(energy) {
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

function cutPathHorizontallyPA(buf, path) {
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

function cutPathVerticallyPA(buf, path) {
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

function transpose(aPA) {
  return new ParallelArray([aPA.shape[1], aPA.shape[0], aPA.shape[2]],
                           function(i,j,k) { return aPA.get(j, i, k); });
}

ParallelArray.fromCanvas = function(canvas) {
  var context = canvas.getContext("2d");
  var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  var inPA = new ParallelArray([canvas.height, canvas.width, 4],
    function(i,j,c) { return imageData.data[i*canvas.width*4+j*4+c]; });
  return inPA;
};

function reduceOneHorizontalPA(canvas) {
    var context = canvas.getContext("2d");
    var buf = context.getImageData(0, 0, virtualWidth, virtualHeight);
    var t1 = new Date();
    var inPA = ParallelArray.fromCanvas(canvas);
    var grayPA = grayScalePA(inPA);
    var edgesPA = detectEdgesPA(grayPA);
    var t2 = new Date();
    parallelComponentTime += (t2 - t1);
    var energy = computeEnergyPA(edgesPA);
    var path = findPathPA(energy);
    var res = cutPathHorizontallyPA(buf, path);
    context.putImageData(res, 0, 0);
}

function reduceOneVerticalPA(canvas) {
    var context = canvas.getContext("2d");
    var buf = context.getImageData(0, 0, virtualWidth, virtualHeight);
    var t1 = new Date();
    var inPA = ParallelArray.fromCanvas(canvas);
    var grayPA = grayScalePA(transpose(inPA));
    var edgesPA = detectEdgesPA(grayPA);
    var t2 = new Date();
    parallelComponentTime += (t2 - t1);
    var energy = computeEnergyPA(edgesPA);
    var path = findPathPA(energy);
    var res = cutPathVerticallyPA(buf, path);
    context.putImageData(res, 0, 0);
}

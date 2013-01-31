/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// A JXexpr is one of:
// - String
// - [String, JXexpr, ...]
// - [String, {String:String, ...}, JXexpr, ...]

function likelyJx(x) { return (typeof(x) == "string") || (x instanceof Array); }

function jxToElem(jx) {
    if (typeof(jx) == "string") {
        return document.createTextNode(jx);
    } else if (likelyJx(jx[1])) {
        var e = document.createElement(jx[0]);
        for (var i = 1; i < jx.length; i++) {
            e.appendChild(jxToElem(jx[i]));
        }
        return e;
    } else {
        var e = document.createElement(jx[0]);
        for (n in jx[1]) {
            e.attributes[n] = jx[1][n];
        }
        for (var i = 2; i < jx.length; i++) {
            e.appendChild(jxToElem(jx[i]));
        }
        return e;
    }
}

function divWriteJx(id, jx) {
    var elem = document.getElementById(id);
    var e = jxToElem(jx);
    elem.appendChild(e);
}

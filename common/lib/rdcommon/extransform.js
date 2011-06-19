/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at:
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Raindrop Code.
 *
 * The Initial Developer of the Original Code is
 *   The Mozilla Foundation
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Andrew Sutherland <asutherland@asutherland.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Exception transformation/normalization logic from the soon-to-be-dead
 *  jstut "esther" speculative test framework.  (Loggest and ArbPL are descended
 *  replacements for it.)
 *
 * This defines a "defineStackTrace" method on Error as a side-effect which
 *  means no one else but us is allowed to try that trick.  It's unclear what
 *  impact this has on the node default handlers... although I'm sure it will
 *  become obvious real quick.
 **/

define(
  [
    'exports'
  ],
  function(
    exports
  ) {

var baseUrl;
// XXX previous requirejs web magic...
if (false) {
  baseUrl = require.s.contexts._.config.baseUrl;
  if (baseUrl.length > 3 && baseUrl.substring(0, 3) === "../") {
    var targUrl = document.location.origin + document.location.pathname;
    // strip down to the parent directory (lose file or just trailing "/")
    targUrl = targUrl.substring(0, targUrl.lastIndexOf("/"));
    // eat the relative bits of the baseUrl
    while (baseUrl.length >= 3 && baseUrl.substring(0, 3) === "../") {
      targUrl = targUrl.substring(0, targUrl.lastIndexOf("/"));
      baseUrl = baseUrl.substring(3);
    }
    baseUrl = targUrl + baseUrl + "/";
    console.log("baseUrl", baseUrl);
  }
}
else {
  require(['path'], function($path) {
    baseUrl = $path.resolve('.');
  });
}



function uneval(x) {
  return JSON.stringify(x);
}

function simplifyFilename(filename) {
  if (!filename)
    return filename;
  // can we reduce it?
  if (filename.substring(0, baseUrl.length) === baseUrl) {
    // we could take this a step further and do path analysis.
    return filename.substring(baseUrl.length);
  }
  return filename;
}

// Thunk the stack format in v8
Error.prepareStackTrace = function(e, frames) {
  var o = [];
  for (var i = 0; i < frames.length; i++) {
    var frame = frames[i];
    o.push({
      filename: simplifyFilename(frame.getFileName()),
      lineNo: frame.getLineNumber(),
      funcName: frame.getFunctionName(),
    });
  }
  return o;
};
// raise the limit in case of super-nested require()s
//Error.stackTraceLimit = 64;

// XXX not sure if this even works since Error is not supposed to be
//  configurable... provide a captureStackTrace method
if (!Error.captureStackTrace) {
  Error.captureStackTrace = function(who, errType) {
    try {
      throw new Error();
    }
    catch(ex) {
      who.stack = ex.stack;
    }
  };
}

var SM_STACK_FORMAT = /^(.*)@([^:]):\d+$/;

// this is biased towards v8/chromium for now
/**
 *
 */
exports.transformException = function transformException(e) {
  // it's conceivable someone
  if (!(e instanceof Error)) {
    return {
      n: "Object",
      m: "" + e,
      f: [],
    };
  }

  var stack = e.stack;
  // evidence of v8 thunk?
  if (Array.isArray(stack)) {
    return {
      n: e.name,
      m: e.message,
      f: stack,
    };
  }

  // handle the spidermonkey case, XXX maybe
  var o = {
    n: e.name,
    m: e.message,
    f: [],
  };
  var sframes = e.stack.split("\n"), frames = o.f, match;
  for (var i = 0; i < sframes.length; i++) {
    if ((match = SM_STACK_FORMAT.exec(sframes[i]))) {
      frames.push({
        filename: simplifyFilename(match[2]),
        lineNo: match[3],
        funcName: bits[1],
      });
    }
  }

  return o;
}

}); // end define

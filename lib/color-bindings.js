'use strict';
const path = require('path');
module.exports = function (customColorBindingsFile) {
  let customColors = {};
  if (customColorBindingsFile) {
    customColors = require(path.resolve(customColorBindingsFile));
  }

  return Object.assign({
    "drop": "^r",
    "pick": "^g",
    "reword": "^Y",
    "edit": "^b",
    "squash": "^M",
    "fixup": "^C",
    "break": "^-^/^b",
    "hash": "^_^w",
    "comment": "^K",
    "message" : "^c"
  }, customColors);
};

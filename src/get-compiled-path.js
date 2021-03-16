"use strict";
exports.__esModule = true;
exports.getCompiledPath = void 0;
var crypto_1 = require("crypto");
var path_1 = require("path");
var cwd = process.cwd();
exports.getCompiledPath = function (code, fileName, compiledDir) {
    var hash = crypto_1["default"]
        .createHash('sha256')
        .update(fileName + code, 'utf8')
        .digest('hex');
    fileName = path_1["default"].relative(cwd, fileName);
    var hashed = fileName.replace(/[^\w]/g, '_') + '_' + hash + '.js';
    return path_1["default"].join(compiledDir, hashed);
};

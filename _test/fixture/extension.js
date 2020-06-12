// Example extension/transpiler with options
module.exports = function (options) {
  if (typeof options !== 'object') {
    throw new Error('Expected options to be an object');
  }
  if (options.test !== true) {
    throw new Error('Expected options.test to be true');
  }
};

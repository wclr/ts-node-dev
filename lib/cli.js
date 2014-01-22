/**
 * Look for an argument with the given name and remove it if found.
 * Returns `true` if the argument is found, the `defautlValue` value otherwise.
 */
function option(args, name, defaultValue) {
  var i = args.indexOf(name)
  if (~i) {
    args.splice(i, 1)
    return true
  }
  return defaultValue
}

exports.parseOpts = function(args, defaults) {
  return {
    deps: !option(args, '--no-deps', !defaults.deps)
  }
}

exports.injectScript = function(args, script) {
  // Find the first arg that is not an option
  for (var i=0; i < args.length; i++) {
    if (!/^-/.test(args[i])) {
      // Splice script into the argument list
      args.splice(i, 0, script)
      break
    }
  }
}

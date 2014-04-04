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
  var deps = defaults.deps

  // truthy: --all-deps, falsy: one level
  if (typeof deps != 'number') deps = deps? -1 : 1

  if (option(args, '--all-deps')) deps = -1
  else if (option(args, '--no-deps')) deps = 0

  return {
    deps: deps
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

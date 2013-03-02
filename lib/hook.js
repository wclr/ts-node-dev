var vm = require('vm')
  , cfg = require('./cfg')

module.exports = function(wrapper, callback) {

  var origs = {}
    , hooks = {}

  // Hook into Node's `require(...)`
  updateHooks()

  // Patch the vm module to watch files executed via one of these methods:
  if (cfg.vm) {
    patch(vm, 'createScript', 1)
    patch(vm, 'runInThisContext', 1)
    patch(vm, 'runInNewContext', 2)
    patch(vm, 'runInContext', 2)
  }

  /**
   * (Re-)install hooks for all registered file extensions.
   */
  function updateHooks() {
    var handlers = require.extensions
    for (var ext in handlers) {

      // Get or create the hook for the extension
      var hook = hooks[ext] || (hooks[ext] = createHook(ext))

      if (handlers[ext] !== hook) {
        origs[ext] = handlers[ext]
        handlers[ext] = hook
      }
    }
  }

  /**
   * Returns a function that can be put into `require.extensions` in order to
   * invoke the callback handler when a module is required for the first time.
   */
  function createHook(ext) {
    return function(module, filename) {
      if (module.parent == wrapper) {
        // If the main module is required conceal the wrapper
        module.id = '.'
        module.parent = null
        process.mainModule = module
      }
      if (!module.loaded) callback(module.filename)

      // Invoke the original handler
      origs[ext](module, filename)

      // Make sure the module did not hijack the handler
      updateHooks()
    }
  }

  /**
   * Patch the specified method to watch the file at the given argument
   * index.
   */
  function patch(obj, method, fileArgIndex) {
    var orig = obj[method]
    obj[method] = function() {
      var file = arguments[fileArgIndex]
      if (file) callback(file)
      return orig.apply(this, arguments)
    }
  }

}

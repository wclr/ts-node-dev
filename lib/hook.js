var vm = require('vm')

module.exports = function(wrapper, watch) {

  var origs = {}
    , hooks = {}

  function createHook(ext) {
    return function(module, filename) {
      if (module.parent == wrapper) {
        // If the main module is required conceal the wrapper
        module.id = '.'
        module.parent = null
        process.mainModule = module
      }
      if (!module.loaded) watch(module.filename)

      // Invoke the original handler
      origs[ext](module, filename)

      // Make sure the module did not hijack the handler
      updateHooks()
    }
  }

  /**
   * (Re-)installs hooks for all registered file extensions.
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
  updateHooks()

  /**
   * Patches the specified method to watch the file at the given argument
   * index.
   */
  function patch(obj, method, fileArgIndex) {
    var orig = obj[method]
    obj[method] = function() {
      var file = arguments[fileArgIndex]
      if (file) watch(file)
      return orig.apply(this, arguments)
    }
  }

  // Monkey-patch the vm module to watch files executed via one of these methods:
  patch(vm, 'createScript', 1)
  patch(vm, 'runInThisContext', 1)
  patch(vm, 'runInNewContext', 2)
  patch(vm, 'runInContext', 2)

}

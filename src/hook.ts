import vm from 'vm'
import { Config } from './cfg'

declare const process: NodeJS.Process & { mainModule: NodeJS.Module }

export const makeHook = function (
  cfg: Config,
  wrapper: any,
  callback: (file: string) => void
) {
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
   * Patch the specified method to watch the file at the given argument
   * index.
   */
  function patch(obj: any, method: string, optionsArgIndex: number) {
    const orig = obj[method]
    if (!orig) return
    obj[method] = function () {
      const opts = arguments[optionsArgIndex]
      let file = null
      if (opts) {
        file = typeof opts == 'string' ? opts : opts.filename
      }
      if (file) callback(file)
      return orig.apply(this, arguments)
    }
  }

  /**
   * (Re-)install hooks for all registered file extensions.
   */
  function updateHooks() {
    Object.keys(require.extensions).forEach(function (ext) {
      const fn = require.extensions[ext]
      if (typeof fn === 'function' && fn.name !== 'nodeDevHook') {
        require.extensions[ext] = createHook(fn)
      }
    })
  }

  /**
   * Returns a function that can be put into `require.extensions` in order to
   * invoke the callback when a module is required for the first time.
   */
  function createHook(handler: (m: NodeJS.Module, filename: string) => void) {
    return function nodeDevHook(module: NodeJS.Module, filename: string) {
      if (module.parent === wrapper) {
        // If the main module is required conceal the wrapper
        module.id = '.'
        module.parent = null
        process.mainModule = module
      }
      if (!module.loaded) callback(module.filename)

      // Invoke the original handler
      handler(module, filename)

      // Make sure the module did not hijack the handler
      updateHooks()
    }
  }
}

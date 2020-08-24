import path from 'path'

const hasOwnProperty = (object: any, property: string) => {
  return Object.prototype.hasOwnProperty.call(object, property)
}

export const getCwd = (
  dir: string,
  scriptMode: boolean,
  scriptPath?: string
) => {
  if (scriptMode) {
    if (!scriptPath) {
      console.error(
        'Script mode must be used with a script name, e.g. `ts-node-dev -s <script.ts>`'
      )
      process.exit()
    }

    if (dir) {
      console.error('Script mode cannot be combined with `--dir`')
      process.exit()
    }

    // Use node's own resolution behavior to ensure we follow symlinks.
    // scriptPath may omit file extension or point to a directory with or without package.json.
    // This happens before we are registered, so we tell node's resolver to consider ts, tsx, and jsx files.
    // In extremely rare cases, is is technically possible to resolve the wrong directory,
    // because we do not yet know preferTsExts, jsx, nor allowJs.
    // See also, justification why this will not happen in real-world situations:
    // https://github.com/TypeStrong/ts-node/pull/1009#issuecomment-613017081
    const exts = ['.js', '.jsx', '.ts', '.tsx']
    const extsTemporarilyInstalled = []
    for (const ext of exts) {
      if (!hasOwnProperty(require.extensions, ext)) {
        // tslint:disable-line
        extsTemporarilyInstalled.push(ext)
        require.extensions[ext] = function () {} // tslint:disable-line
      }
    }
    try {
      return path.dirname(require.resolve(scriptPath))
    } finally {
      for (const ext of extsTemporarilyInstalled) {
        delete require.extensions[ext] // tslint:disable-line
      }
    }
  }

  return dir
}

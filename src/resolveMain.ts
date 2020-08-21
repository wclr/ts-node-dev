const resolve = require('resolve')

type PNPVersions = NodeJS.ProcessVersions & { pnp: boolean }

function resolveRequest(req: string) {
  // The `resolve` package is prebuilt through ncc, which prevents
  // PnP from being able to inject itself into it. To circumvent
  // this, we simply use PnP directly when available.

  if ((process.versions as PNPVersions).pnp) {
    const { resolveRequest } = require(`pnpapi`)
    return resolveRequest(req, process.cwd() + '/')
  } else {
    const opts = {
      basedir: process.cwd(),
      paths: [process.cwd()],
    }
    return resolve.sync(req, opts)
  }
}

export const resolveMain = function (main: string) {
  try {
    return resolveRequest(main + '.ts')
  } catch (e) {
    try {
      return resolveRequest(main + '/index.ts')
    } catch (e) {
      return resolveRequest(main)
    }
  }
}

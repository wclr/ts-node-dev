var resolve = require('resolve');

function resolveRequest(req) {
  // The `resolve` package is prebuilt through ncc, which prevents
  // PnP from being able to inject itself into it. To circumvent
  // this, we simply use PnP directly when available.
  // @ts-ignore
  if (process.versions.pnp) {
    const { resolveRequest } = require(`pnpapi`)
    return resolveRequest(req, process.cwd() +"/")
  } else {
    
    var opts = {
      basedir: process.cwd(),
      paths: [process.cwd()]
    };
    return resolve.sync(req, opts)
  }
}

module.exports = function (main) {
  try {
    return resolveRequest(main + '.ts');
  } catch (e) {
    try {
      return resolveRequest(main + '/index.ts');
    } catch (e) {
      return resolveRequest(main);
    }  
  }  
};

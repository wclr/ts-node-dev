# ts-node-dev 

> Tweaked version of [node-dev](https://github.com/fgnass/node-dev) that uses [ts-node](https://github.com/TypeStrong/ts-node) under the hood. 

It restarts target node process when any of required files changes (as standard `node-dev`) but shares [Typescript](https://github.com/Microsoft/TypeScript/) compilation process between restarts. This significantly increases speed of restarting comparing to `node-dev -r ts-node/register ...`, `nodemon -x ts-node ...` variations because there is no need to instantiate `ts-node` compilation each time.

## Install

```
yarn add ts-node-dev
```

```
npm i ts-node-dev
```

`ts-node` dependency version is not fixed, so it will install the latest version by default.

## Usage

```
ts-node-dev [node-dev|ts-node flags] [ts-node-dev flags] [script] [script arguments]
```

So you just combine [node-dev](https://github.com/fgnass/node-dev) and [ts-node](https://github.com/TypeStrong/ts-node) options (see docs of those packages):
```
ts-node-dev --respawn --transpileOnly server.ts
```

Also there are additional options specific to `ts-node-dev`:

- `--prefer-ts` (default: false) - for each `.js` file (that is not in `node_modules`) will try to check if corresponding `.ts` version exists and require it.
- `--ignore-watch` (default: []) - files/folders to be [ignored by `node-dev`](https://github.com/fgnass/node-dev#ignore-paths).  **But also this behaviour enhanced:** it will also make up `new RegExp` of passed ignore string and check absolute paths of required files for match. 
So, to ignore everthing in `node_modules`, just pass `--ignore-watch node_modules`

NB! `--ignore-watch` will NOT affect files ignored by TS compilation. Use `--ignore` option (or `TS_NODE_IGNORE` env variable) to pass **RegExp strings** for filtering files that should not be compiled, by default `/node_modules/` are ignored.

## Caveats

The good thing is that `ts-node-dev` watches used `tsconfig.json` file, and will reinitialize compilation on its change, but you have to restart the process manually when you update used version of `typescript` or make any other changes that may effect compilation results.

## License

WTF.

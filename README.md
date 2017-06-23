# ts-node-dev 

> Hacked version of [node-dev](https://github.com/fgnass/node-dev) that uses [ts-node](https://github.com/TypeStrong/ts-node) under the hood. 

It restarts target node process when any of required files changes (as standard `node-dev`) but shares [Typescript](https://github.com/Microsoft/TypeScript/) compilation process between restarts. This significantly increases speed of restarting comparing to `node-dev -r ts-node/register ...`, `nodemon -x ts-node ...` variations because there is no need to instantiate `ts-node` compilation each time.

## Install

```
yarn add ts-node-dev
```

```
npm i ts-node-dev --global
```

## Usage

```
ts-node-dev [node-dev|ts-node flags] [ts-node-dev flags] [script] [script arguments]
```

So you just combine [node-dev](https://github.com/fgnass/node-dev) and [ts-node](https://github.com/TypeStrong/ts-node) options (lookup docs of those packages):
```
ts-node-dev --fast --respawn server.ts
```

Also there is additional options specific to `ts-node-dev`:

- `--compile-timeout` (default: 10000 ms) - for how long to wait before report the error that something went wrong with compilation of a file.

By defalut it keeps cached files in system temp directory, you may change this with `--cache-directory` option.


## Caveats

The good thing is that `ts-node-dev` watches used `tsconfig.json` file, and will reinitialize compilation on its change, but you have to restart the process manually when you update used version of `typescript` or make any other changes that may effect compilation results.

## License

WTF.

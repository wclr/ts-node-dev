# ts-node-dev 

> Hacked version of [node-dev](https://github.com/fgnass/node-dev) that uses [ts-node](https://github.com/TypeStrong/ts-node) under the hood. 

It restarts target node process when any of required files changes (as standard `node-dev`) but shares [Typescript](https://github.com/Microsoft/TypeScript/) compilation process between restarts significantly increasing speed of restarting. Because comparing to `node-dev -r ts-node/register ...` there is no need to instantiate `ts-node` compilation each time.

## Install

```
yarn add ts-node-dev
```

```
npm i ts-node-dev --global
```

## Usage

```
ts-node-dev [node-dev|ts-node flags] [script] [script arguments]
```


```
ts-node-dev --fast --respawn server.ts
```




By defalut it puts compiled and cached files in the `.ts-node` directory of the project, so put it in `.gitignore`.

## License

WTF.

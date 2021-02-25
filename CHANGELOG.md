# ts-node-dev changelog

## 1.1.3 (2021-02-25)

- fix: update bin scripts paths

## 1.1.2 (2021-02-25)

- fix: update chokidar version


## 1.1.1 (2020-12-10)

- fix: remove duplicate compilation call

## 1.1.0 (2020-12-10)

- fix: not kill child process if it has its own exception handlers 
- fix: use either `process.send` or `writeFile` fallback
- fix: prevent handling of duplicate compilation requests

## 1.0.0 (2020-10-17)

- upgrade to ts-node v9

## 1.0.0-pre.65 (2020-10-15)

- add --quiet option to silent [INFO] messages

## 1.0.0-pre.63 (2020-09-22)

- fix --cache-directory flag

## 1.0.0-pre.62 (2020-08-22)

- fix child fork override

## 1.0.0-pre.61 (2020-08-26)

- fix terminal clear

## 1.0.0-pre.60 (2020-08-22)

- full migration to typescript src
- fixes of require.extensions behavior in compiler
- child error stack output is back

## 1.0.0-pre.59 (2020-08-20)

- fix handing require extensions (#185, #196)

## 1.0.0-pre.58 (2020-08-18)

- show versions only on first start

## 1.0.0-pre.57 (2020-08-13)

- fix `--deps` flag
- add `--deps-level` flag
- remove setting default NODE_ENV
- add process.env.TS_NODE_DEV = 'true'

## 1.0.0-pre.56 (2020-07-24)

- add `node-notifier` from `peerDependencies` make optional

## 1.0.0-pre.55 (2020-07-24)

- remove `node-notifier` from `peerDependencies`

## 1.0.0-pre.54 (2020-07-23)

- handle JSX extension, when `allowJs` enabled

## 1.0.0-pre.53 (2020-07-23)

- move `node-notifier` to `peerDependencies`
- add --script-mode flag handling

## 1.0.0-pre.52 



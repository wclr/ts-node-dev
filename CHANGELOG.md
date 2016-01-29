# node-dev

## 3.0.0 / 2016-01-29

- Add `--respawn` to keep watching after a process exits. See #104.
- Don't terminate the child process if a custom `unchaughtException` handler is registered. See #113.
- Handle `-r` and `--require` node options correctly. See #111.
- Add support for passing options to transpilers. See #109.
- Handle `--no-deps` correctly. See #108.
- Switch to airbnb code style
- Use greenkeeper.io to keep dependencies up to date


## 2.7.1 / 2015-08-21

- Add `--poll` to fix #87
- Switch from [`commander`][npm-commander] to [`minimist`][npm-minimist]
- Fix issues introduced in 2.7.0. See #102 for details.

## 2.7.0 / 2015-08-17

- Support ignoring file paths, e.g. for universal (isomorphic) apps. See
  [`README`][README-ignore-paths] for more details.
- Use [`commander`][npm-commander] for CLI argument parsing instead of custom code.
- Extract [`LICENSE`][LICENSE] file.
- Upgrade [`tap`][npm-tap] module to 1.3.2.
- Use [`touch`][npm-touch] module instead of custom code.


[LICENSE]: LICENSE
[npm-commander]: https://www.npmjs.com/package/commander
[npm-minimist]: https://www.npmjs.com/package/minimist
[npm-tap]: https://www.npmjs.com/package/tap
[npm-touch]: https://www.npmjs.com/package/touch
[README]: README.md
[README-ignore-paths]: README.md#ignore-paths

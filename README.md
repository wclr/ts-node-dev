# ts-node-dev 

> "Hacked" version of [node-dev](https://github.com/fgnass/node-dev) that uses [ts-node](https://github.com/TypeStrong/ts-node) under-the-hood. 

It restarts target node process on file changes (as standard `node-dev`) but shares [Typescrpt](https://github.com/Microsoft/TypeScript/) compilation process between restarts, thus significantly increasing speed of restarting.

```
ts-node-dev --fast --respawn index.ts
```

By defalut it puts compiled and cached files in the `.ts-node` directory of the project, so put it in `.gitignore`.

## License

WFT.

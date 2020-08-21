#!/usr/bin/env node

const dev = require('.')
import minimist from 'minimist'

const nodeArgs: string[] = []
const unknown: string[] = []

const devArgs = process.argv.slice(2, 100)

const tsNodeFlags = {
  boolean: [
    'scope',
    'emit',
    'files',
    'pretty',
    'transpile-only',
    'prefer-ts-exts',
    'prefer-ts',
    'log-error',
    'skip-project',
    'skip-ignore',
    'compiler-host',
    'script-mode',
  ],

  string: [
    'compiler',
    'project',
    'ignore',
    'ignore-diagnostics',
    'compiler-options',
  ],
}

const tsNodeAlias = {
  'transpile-only': 'T',
  'compiler-host': 'H',
  ignore: 'I',
  'ignore-diagnostics': 'D',
  'compiler-options': 'O',
  compiler: 'C',
  project: 'P',
  'script-mode': 's',
}

type TSNodeOptions = {
  project: string
  compilerOptions: any
  'compiler-options': any
  'prefer-ts-exts': boolean
  ignore?: string

  dir: string
  'script-mode': boolean
  emit: boolean
  files: boolean
  'transpile-only': boolean
  pretty: boolean
  scope: boolean
  'log-error': boolean
  'skip-project': boolean
  'skip-ignore': boolean
  compiler: string
  'compiler-host': boolean
  'ignore-diagnostics': string
}

const devFlags = {
  boolean: [
    'deps',
    'all-deps',
    'dedupe',
    'exec-check',
    'debug',
    'poll',
    'respawn',
    'notify',
    'tree-kill',
    'clear',
    'cls',
    'exit-child',
    'error-recompile',
    'rs',
  ],
  string: [
    'dir',
    'deps-level',
    'compile-timeout',
    'ignore-watch',
    'interval',
    'debounce',
    'watch',
  ],
}

type DevOptions = {
  poll: boolean
  debug: boolean,
  watch: string
  interval: string
  rs: boolean
  deps: boolean,
  dedupe: boolean,
  respawn: boolean,
  notify: boolean,
  clear: boolean,
  cls: boolean,
  'ignore-watch': string,
  'all-deps': boolean,
  ['deps-level']: string
  'compile-timeout': string
  'exec-check': boolean
  'exit-child': boolean
  'cache-directory': string
  'error-recompile': boolean,
  'tree-kill': boolean
}

export type Options = {
  priorNodeArgs: string[]
  _: string[]
} & DevOptions &
  TSNodeOptions

const opts = minimist(devArgs, {
  stopEarly: true,
  boolean: [...devFlags.boolean, ...tsNodeFlags.boolean],
  string: [...devFlags.string, ...tsNodeFlags.string],
  alias: {
    ...tsNodeAlias,
    'prefer-ts-exts': 'prefer-ts',
  },
  default: {},
  unknown: function (arg) {
    unknown.push(arg)
    return true
  },
}) as Options

const script = opts._[0]
const scriptArgs = opts._.slice(1)

opts.priorNodeArgs = []

unknown.forEach(function (arg) {
  if (arg === script || nodeArgs.indexOf(arg) >= 0) return

  const argName = arg.replace(/^-+/, '')
  // fix this
  const argOpts = (opts as any)[argName]
  const argValues = Array.isArray(argOpts) ? argOpts : [argOpts]
  argValues.forEach(function (argValue) {
    if ((arg === '-r' || arg === '--require') && argValue === 'esm') {
      opts.priorNodeArgs.push(arg, argValue)
      return false
    }
    nodeArgs.push(arg)
    if (typeof argValue === 'string') {
      nodeArgs.push(argValue)
    }
  })
})

if (!script) {
  console.log('Usage: ts-node-dev [options] script [arguments]\n')
  process.exit(1)
}

dev(script, scriptArgs, nodeArgs, opts)

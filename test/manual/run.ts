import { execSync } from 'child_process'

const cmd = [
  'node lib/bin',
  '--exit-child',
  '--tree-kill',
  '--clear',
  '-r tsconfig-paths/register',
  '-r ./test/manual/add-require',
  '-r ./test/manual/add-require-2',
  '-r esm',
  '-O "{\\"module\\": \\"es6\\"}"',
  '--preserve-symlinks',
  '--respawn',
  '--ignore-watch',
  'lib',
  '--ignore-watch bin',
  '--prefer-ts',
  '--debug',
  '--poll',
  '--interval 1000',
  '--inspect',
  '-- test/manual/test-script',
  'test-arg',
  '--fd',
].join(' ')

execSync(cmd, { stdio: 'inherit' })

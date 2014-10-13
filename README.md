[![Build Status](https://secure.travis-ci.org/fgnass/node-dev.png)](http://travis-ci.org/fgnass/node-dev)

### node-dev (1)

Node-dev is a development tool for [Node.js](http://nodejs.org) that
automatically restarts the node process when a file is modified.

In contrast to tools like
[supervisor](https://github.com/isaacs/node-supervisor) or
[nodemon](https://github.com/remy/nodemon) it doesn't scan the filesystem for
files to be watched. Instead it hooks into Node's `require()` function to watch
only the files that have been _actually required_.

This means that you don't have to configure any include- or exclude rules.
If you modify a JS file that is solely used on the client-side but never run on
the server, __node-dev will know__ this and won't restart the process.

This also means that you __don't have to__ configure any file extensions. Just
require a `.json` file or a `.coffee` script for example and it will be watched.
Automatically.

Node-dev uses [filewatcher](https://www.npmjs.org/package/filewatcher) under
the hood and hence will take advantage of the native `fs.watch()` API if it
is available on your system.


# Usage

Just run `node-dev` as you would normally run `node`:

```
node-dev foo.js
```

There are two command line options that can be used to control how many files
are watched:

* `--no-deps` Watch only the project's own files and linked modules (via `npm link`)
* `--all-deps` Watch the whole dependency tree

By default node-dev will watch all first-level dependencies, i.e. the ones in
the project's `node_modules`folder.


# Installation

Node-dev can be installed via npm. Make sure to use the `-g` option to install
it globally.

    npm install -g node-dev

### Desktop Notifications

Status and error messages can be displayed as desktop notification using
[node-notifier](https://www.npmjs.org/package/node-notifier):

![Screenshot](http://fgnass.github.com/images/node-dev.png)

![Screenshot](http://fgnass.github.com/images/node-dev-linux.png)

__Requirements:__

* Mac OS X: >= 10.8 or Growl if earlier.
* Linux: notify-osd installed (Ubuntu should have this by default)
* Windows: >= 8, task bar balloon if earlier or Growl if that is installed.
* General Fallback: Growl


# Settings

Usually node-dev doesn't require any configuration at all, but there are some
options you can set to tweak its behaviour:

* `clear` – Whether to clear the screen upon restarts. _Default:_ `false`
* `notify` – Whether to display desktop notifications. _Default:_ `true`
* `timestamp` – The timestamp format to use for logging restarts. _Default:_ `"HH:MM:ss"`
* `vm` – Whether to watch files loaded via Node's [VM](http://nodejs.org/docs/latest/api/vm.html) module. _Default:_ `true`
* `fork` – Whether to hook into [child_process.fork](http://nodejs.org/docs/latest/api/child_process.html#child_process_child_process_fork_modulepath_args_options) (required for [clustered](http://nodejs.org/docs/latest/api/cluster.html) programs). _Default:_ `true`
* `deps` – How many levels of dependencies should be watched. _Default:_ `1`
* `dedupe` – Whether modules should by [dynamically deduped](https://www.npmjs.org/package/dynamic-dedupe). _Default:_ `false`

Upon startup node-dev looks for a `.node-dev.json` file in the user's HOME
directory. It will also look for a `.node-dev.json` file in the same directory
as the script to be run, which (if present) overwrites the per-user settings.

### Dedupe linked modules

Sometimes you need to make sure that multiple modules get
_exactly the same instance_ of a common (peer-) dependency. This can usually be
achieved by running `npm dedupe` – however this doesn't work when you try to
`npm link` a dependency (which is quite common during development). Therefore
node-dev provides a `--dedupe` switch that will inject the
[dynamic-dedupe](https://www.npmjs.org/package/dynamic-dedupe) module into your
app.

### Transpilers

You can also use node-dev to run transpiled languages. You can either use a
.js file as entry point to your application that registers your transpiler as
require-extension manually, for example by calling `CoffeeScript.register()` or
you can let node-dev do this for you.

There is a config option called `extensions` which maps file extensions to
compiler module names. By default this map looks like this:

```json
    {
        "coffee": "coffee-script/register",
        "ls": "LiveScript"
    }
```

This means that if you run `node-dev foo.coffee` node-dev will do a
`require("coffee-script/register")` before running your script.

__Note:__ If you want to use coffee-script < 1.7 you have to change the
setting to `{"coffee": "coffee-script"}`.

### Graceful restarts

Node-dev sends a `SIGTERM` signal to the child-process if a restart is required.
If your app is not listening for these signals `process.exit(0)` will be called
immediately. If a listener is registered, node-dev assumes that your app will
exit on its own once it is ready.

## License

### The MIT License (MIT)

Copyright (c) 2014 Felix Gnass

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

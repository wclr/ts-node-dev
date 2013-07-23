[![Build Status](https://secure.travis-ci.org/fgnass/node-dev.png)](http://travis-ci.org/fgnass/node-dev)

# node-dev

Node-dev is a development tool for [Node.js](http://nodejs.org) that
automatically restarts the node process when a script is modified.

It's an alternative to tools like
[supervisor](https://github.com/isaacs/node-supervisor) or
[nodemon](https://github.com/remy/nodemon) that doesn't require any
configuration. Just run `node-dev foo.js` as you would normally run `node` and
it will automatically figure out which files need to be watched.

You may also use node-dev with [CoffeeScript](http://http://coffeescript.org/)
or [LiveScript](http://livescript.net/) apps. Just run `node-dev app.coffee`
or `node-dev app.ls`. You may also register additional language flavors by
adding them to the extensions list in your [.node-dev.json](#settings) config
file.

### Desktop Notifications

Status and error messages can be displayed as desktop notification using either
[Growl](http://growl.info/about.php) or
[libnotify](http://developer.gnome.org/libnotify/).

![Screenshot](http://fgnass.github.com/images/node-dev.png)

![Screenshot](http://fgnass.github.com/images/node-dev-linux.png)

### Installation

Node-dev can be installed via [npm](http://github.com/isaacs/npm):

    npm install -g node-dev

In order to use Growl notifications
[growlnotify](http://growl.info/extras.php#growlnotify) must be installed on
your system.

To use OSX's built in notifications:

    sudo gem install terminal-notifier

### Settings

Upon startup node-dev looks for a `.node-dev.json` file in the user's HOME
directory. It will also look for a `.node-dev.json` file in the current
directory which – if present – overwrites the global settings.

* __vm__ – Whether to watch files loaded via Node's [VM](http://nodejs.org/docs/latest/api/vm.html) module. _Default:_ `true`
* __fork__ – Whether to hook into [child_process.fork()](http://nodejs.org/docs/latest/api/child_process.html#child_process_child_process_fork_modulepath_args_options) which is required for [clustered](http://nodejs.org/docs/latest/api/cluster.html) programs. _Default:_ `true`
* __notify__ – Whether to display desktop notifications. _Default:_ `true`
* __timestamp__ – The timestamp format to use for logging restarts. _Default:_ `"HH:MM:ss"`
* __clear__ – Whether to clear the screen upon restarts. _Default:_ `false`
* __extensions__ – Modules to load based bad on extension of the main script. _Default:_
  `{ coffee: "coffee-script", ls: "LiveScript" }`

### The MIT License (MIT)

Copyright (c) 2013 Felix Gnass

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

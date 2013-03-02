About
=====

Node-dev is a development tool for [Node.js](http://nodejs.org) that automatically restarts the node process when a script is modified.

With node-dev you don't have to manually specify which files should be watched nor do you have to deal with ignore lists for files that should be excluded. This is done using a thin wrapper script that hooks into the `require()` function as well as into several methods of the [VM](http://nodejs.org/docs/latest/api/vm.html) module to determine which files need to be monitored.

This does not only work for _.js_ files, but also for _.json_ or _.node_ or  _.coffee_ files or any other custom extension that has been added to `require.extensions`.

Another great benefit of this zero-config approach is that it doesn't cause __any unnecessary restarts__ when for example client-side only scripts are modified.

Desktop Notifications
=====================

Status and error messages are displayed as desktop notification using either [Growl](http://growl.info/about.php) or [libnotify](http://developer.gnome.org/libnotify/).

![Screenshot](http://fgnass.github.com/images/node-dev.png)

![Screenshot](http://fgnass.github.com/images/node-dev-linux.png)


Usage
=====

Simply use the `node-dev` binary as you would normally use `node`.

__Note:__ All arguments are passed on to the child-process. `node-dev --debug app.js` will debug your application, not the supervisor itself.

You may also use node-dev with [CoffeeScript](http://http://coffeescript.org/) apps. Just run `node-dev app.coffee` -- that's all.

Installation
============

Node-dev can be installed via [npm](http://github.com/isaacs/npm):

    npm install -g node-dev

This will install `node-dev` and make it globally available (note the `-g` option).

In order to use Growl notifications [growlnotify](http://growl.info/extras.php#growlnotify) must be installed on your system.

Settings
========

Upon startup node-dev looks for a `.node-dev.json` file in the user's HOME directory. It will also look for a `.node-dev.json` file in the current directory which – if present – overwrites the global settings.

* __vm__ – Whether to watch files loaded via Node's [VM](http://nodejs.org/docs/latest/api/vm.html) module. _Default:_ `true`
* __fork__ – Whether to hook into [child_process.fork()](http://nodejs.org/docs/latest/api/child_process.html#child_process_child_process_fork_modulepath_args_options) which is required for [clustered](http://nodejs.org/docs/latest/api/cluster.html) programs. _Default:_ `true`
* __notify__ – Whether to display desktop notifications. _Default:_ `true`
* __timestamp__ – The timestamp format to use for logging restarts. _Default:_ `"HH:MM:ss"`
* __clear__ – Whether to clear the screen upon restarts. _Default:_ `false`
* __extensions__ – Modules to load based bad on ehxtension of the main script. _Default:_
  `{
    ls: "LiveScript",
    ts: "typescript",
    coffee: "coffee-script"
  }`

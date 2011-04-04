About
=====

Node-dev is a supervisor for Node.js that automatically restarts the node process when a script is modified.

The output written to stderr is captured and scanned for stack-traces. If an error is detected, node-dev displays the error message as [Growl notification](http://growl.info/about.php) and waits until one of the files referenced in the stack-trace is modified again, before it tries to re-span the child-proccess.

![Screenshot](http://cloud.github.com/downloads/fgnass/fgnass.github.com/node-dev.png)

Important
=========

Since version 0.1.0 node-dev instruments node's `require()` function to keep track of the files to watch. This way hot-reloading also works with modules that live outside of your project's directory. Therefore you have to make your scripts _node-dev aware_ by requiring the `node-dev` module (see usage instructions below). 

Usage
=====

Insert `require('node-dev')` __at the top__ of your __main script__ file. Then run your script using the `node-dev` binary (instead of `node`).

All command-line arguments are passed on to the child-process: `node-dev —debug app.js foo` will start the child-process with `--debug` and pass `foo` as first argument. Hence your app will be debugged and not the supervisor itself.

The node-dev module does nothing, if the process was not spawned by the `node-dev` binary, hence it's safe to require it even in production environments.

Installation
============

The node-dev supervisor can be installed via [npm](http://github.com/isaacs/npm):

    npm install node-dev

This will add the `node-dev` executable to your PATH.

In order to use Growl notifications [growlnotify](http://growl.info/extras.php#growlnotify) (form the Extras folder on the Growl disk image) must be installed on your system.

About
=====

Node-dev is a supervisor for Node.js that automatically restarts the node process when a script is modified.

The output written to stderr is captured and scanned for stack-traces. If an error is detected, node-dev displays the error message as [Growl notification](http://growl.info/about.php) and waits until one of the files referenced in the stack-trace is modified again, before it tries to re-span the child-proccess.

![Screenshot](http://cloud.github.com/downloads/fgnass/fgnass.github.com/node-dev.png)

Usage
=====

Use the `node-dev` binary as you would normally use `node`.

All command-line arguments are passed on to the child-process: `node-dev —-debug app.js foo` will start the child-process with `--debug` and pass `foo` as first argument. Hence your app will be debugged and not the supervisor itself.

Installation
============

The node-dev supervisor can be installed via [npm](http://github.com/isaacs/npm):

    npm install node-dev

This will add the `node-dev` executable to your PATH.

In order to use Growl notifications [growlnotify](http://growl.info/extras.php#growlnotify) (form the Extras folder on the Growl disk image) must be installed on your system.

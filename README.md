About
=====

Node-dev is a supervisor for Node.js that spawns a node child-process and restarts it when changes are
detected in the filesystem. If the child-process exits due to an error, the supervisor waits for another
modification before it attempts to re-spawn it. The output written to stderr is captured and 
scanned for stack-traces. If an error is detected it is displayed as [Growl notification](http://growl.info/about.php).

![Screenshot](http://posterous.com/getfile/files.posterous.com/temp-2010-10-11/ewzojubvHbeGggHnwnGahtqHCGeIcIGyivdDptgotIbqyIjjcFejGlgblJHE/screenshot.png)

Installation
============

The node-dev supervisor can be installed via [npm](http://github.com/isaacs/npm):

    npm install node-dev

This will add the `node-dev` executable to your PATH.

In order to use Growl notifications [growlnotify](http://growl.info/extras.php#growlnotify) (form the Extras folder on the Growl disk image) must be installed on your system.

Usage
=====

Instead of running `node script.js`, type `node-dev script.js` instead.

All command-line arguments are passed on to the child-process: `node-dev —debug app.js foo` will start the child-process with `--debug` and pass `foo` as first argument. Hence your app will be debugged and not the supervisor itself.

About
=====

Node.js supervisor that spawns a node child-process and restarts it when changes are detected 
in the filesystem. If the child-process exits due to an error, the supervisor waits for another
modification before it attempts to re-spawn it. The output written to stderr is captured and 
scanned for stack-traces. If an error is detected it is displayed as Growl notification.

Usage
=====

Instead of running `node script.js`, type `node-dev script.js` instead.

All command-line arguments are passed on to the child-process: `node-dev —debug app.js foo` will start the child-process with `--debug` and pass `foo` as first argument. Hence your app will be debugged and not the supervisor itself.

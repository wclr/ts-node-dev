About
=====

Node-dev is a supervisor for Node.js that automatically restarts the node process when a script is modified. Status and error messages are displayed as desktop notification using either [Growl](http://growl.info/about.php) or [libnotify](http://developer.gnome.org/libnotify/).

Node-dev hooks into the `require()` function to determine which files need to be monitored. Hence it also works with linked modules that live outside of your project directory and doesn't cause any unnecessary server restarts when client-side JavaScript files are modified. 


![Screenshot](http://fgnass.github.com/images/node-dev.png)

![Screenshot](http://fgnass.github.com/images/node-dev-linux.png)

Usage
=====

Simply use the `node-dev` binary as you would normally use `node`.

Installation
============

The node-dev supervisor can be installed via [npm](http://github.com/isaacs/npm):

    npm install node-dev

This will add the `node-dev` executable to your PATH.

In order to use Growl notifications [growlnotify](http://growl.info/extras.php#growlnotify) (form the Extras folder on the Growl disk image) must be installed on your system.


Contributors
============

* [Ricardo Tomasi](https://github.com/ricardobeat) (CoffeeScript support)
* [Sergey Ovechkin](https://github.com/pomeo) (libnotify support)
* [Piotr Sokólski](https://github.com/pyetras) (stdin pumping)
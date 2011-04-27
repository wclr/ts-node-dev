#!/bin/sh
# Displays a desktop notification using Growl (OS X) or libnotify (Linux). 

title=$1
message=$2
icon=$3

growl=`which growlnotify`
libnotify=`which notify-send`

if [ -x $growl ]; then
  $growl --image "$icon" -m "$message" "$title"
elif [ -x $libnotify ]; then
  $libnotify "$title" "$message" -i "$icon"
fi

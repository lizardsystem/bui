bui
===

Repo for the 'Bui' app, which is an iOS/Android client for the Nationale Regenradar back-end.


Development
-----------

 - For iOS development, use a Mac. For Android development you can use Linux.
 - For Android, install openjdk7 and follow the instructions on the [Phonegap docs](http://docs.phonegap.com/).
 - For iOS, install XCode.
 - Install [node.js](http://nodejs.org/) on your system.
 - Get Phonegap running on your system

```
$ sudo npm install -g phonegap
```
 
 - Clone this repo, cd into it and depending on your deployment target, run:

```
$ phonegap run ios
$ phonegap run android
```

 - Develop in www/index.html and www/js etc.
 - When you want to test in XCode or Eclipse, run 'phonegap run ios/android' again.
 - In platforms/ios/, there's a file HelloWorld.xcodeproj which you can open in XCode and build/test/debug.
 - **Don't edit code in XCode** because it'll get overwritten.

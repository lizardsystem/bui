bui
===

Repo for the 'Bui' app, which is an iOS/Android client for the Nationale Regenradar back-end.


Development
-----------

 - For iOS development, use a Mac. For Android development you can use Linux.
 - For Android, install openjdk7 and follow the instructions on the [Phonegap docs](http://docs.phonegap.com/).
 - For iOS, install XCode.
 - Install [node.js](http://nodejs.org/) on your system.
 - Get Phonegap running on your system.

```
$ sudo npm install -g cordova
```
 
 - Clone this repo, cd into it and depending on your deployment target, run:

```
$ cordova [run/build] [platform]
```

 - Add plugins
 
```
$ cordova plugin add org.apache.cordova.splashscreen
$ cordova plugin add org.apache.cordova.file
$ cordova plugin add org.apache.cordova.file-transfer
$ cordova plugin add org.apache.cordova.geolocation
```

Building for android:
---------------------
 
 - Add a platforms directory if absent:

```
$ mkdir platforms
```

 - Add platform:

```
$ cordova platform add android
```

 - Add icons and splashscreens to platforms/android/res/<icons-folders>/<splash|icon>.png

 - Add to platforms/android/res/xml/config.xml:
```
<preference name="splashscreen" value="splash" />
<preference name="splashScreenDelay" value=10000 />
```
and in to platforms/android/res/xml/config.xml, set exit on suspend to true:
```
<preference name="exit-on-suspend" value="true" />
```

add to platforms/android/AndroidManifest.xml:
```
<uses-permission android:name="android.permission.ACCESS_LOCATION_EXTRA_COMMANDS" />
```


 - Develop in www/index.html and www/js etc.
 - When you want to test in XCode or Eclipse, run 'cordova run ios/android' again.
 - In platforms/ios/, there's a file Bui.xcodeproj which you can open in XCode and build/test/debug.
 - **Don't edit code in XCode** because it'll get overwritten.


Building for iOS
----------------

 - Add a platforms directory if absent:

```
$ mkdir platforms
```

 - Install Phonegap plugins:

```
$ cordova plugin add org.apache.cordova.file
$ cordova plugin add org.apache.cordova.file-transfer
$ cordova plugin add org.apache.cordova.geolocation
$ cordova plugin add org.apache.cordova.splashscreen
```

 - Add iOS platform:

```
$ cordova platform add ios
```

 - Build Cordova package:

```
$ cordova build ios
```

- Open the .xcodeproj in XCode (located in ./platforms/ios/) and build/test/analyze/run/deploy from there.


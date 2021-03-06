bui
===

Repo for the 'Bui' app, which is an iOS/Android client for the Nationale Regenradar back-end.


 - For iOS development, use a Mac. For Android development you can use Linux.
 - For Android, install openjdk7 and follow the instructions on the [Phonegap docs](http://docs.phonegap.com/).
 - For iOS, install XCode.
 - Install [node.js](http://nodejs.org/) on your system.

 - Get Phonegap running on your system.

 ```
 $ sudo npm install -g cordova@3.1.0-0.1.0
 ```
 - Clone this repo and cd into it
 
 - Add a platforms directory if absent:

 ```
 $ mkdir platforms
 ```
 
 - Depending on your deployment target:

Building for android:
---------------------

 - Add platform:

 ```
 $ cordova platform add android
 ```

 - Add plugins: 
 ```
 $ cordova plugin add org.apache.cordova.splashscreen
 $ cordova plugin add org.apache.cordova.file
 $ cordova plugin add org.apache.cordova.file-transfer
 $ cordova plugin add org.apache.cordova.geolocation
 $ cordova plugin add org.apache.cordova.network-information
 $ cordova plugin add org.apache.cordova.device-motion
 $ cordova plugin add org.apache.cordova.device
 $ cordova plugin add org.apache.cordova.dialogs
 ```

 - Add icons and splashscreens to platforms/android/res/icons-folders/splash|icon.png

 - Add to platforms/android/res/xml/config.xml:
 ```
 <preference name="show-splash-screen-spinner" value="false" />
 <preference name="auto-hide-splash-screen" value="true" />
 <preference name="splashscreen" value="splash" />
 <preference name="splashScreenDelay" value="5000" />
 ```

 - Make your android/src/com/nens/bui/Bui.java look like this:
 ```
 public void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);
        super.setIntegerProperty("splashscreen", R.drawable.splash);
        super.setIntegerProperty("splashScreenDelay", 100000); //time to display the splash
        super.init();
        // Set by <content src="index.html" /> in config.xml
        super.loadUrl(Config.getStartUrl());
        //super.loadUrl("file:///android_asset/www/index.html")
    }
 ```

 - Add to platforms/android/AndroidManifest.xml:
 ```
 <uses-permission android:name="android.permission.ACCESS_LOCATION_EXTRA_COMMANDS" />
 <activity... android:screenOrientation="portrait" ...>
 ```

 - To release:
 ```
 $ cordova build --release android
 $ cd platforms/android/bin
 $ jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ~/Development/bui.keystore Bui-release-unsigned.apk bui
 $ zipalign -v 4 Bui-release-unsigned.apk Bui.apk


 ```
You will find your unsigned release apk in platforms/android/bin/

Building for iOS
----------------

 - Install Phonegap plugins:

 ```
 $ cordova plugin add org.apache.cordova.file
 $ cordova plugin add org.apache.cordova.file-transfer
 $ cordova plugin add org.apache.cordova.geolocation
 $ cordova plugin add org.apache.cordova.splashscreen
 $ cordova plugin add org.apache.cordova.network-information
 $ cordova plugin add org.apache.cordova.device-motion
 $ cordova plugin add org.apache.cordova.device
 $ cordova plugin add org.apache.cordova.dialogs
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
 
 - To add the custom icons/splashscreens, open XCode.
 	- Icons: copy them from the icons/icon/ios folder to platforms/ios/Bui/Resources/icons
 	- Splashscreens: copy them from the icons/screen/ios folder to platforms/ios/Bui/Resources/splash
 
 - Press CTRL-SHIFT-K to clean the product.

 - Verify that the images are set in XCode under the tab 'General' of the Bui target.

 - Build, wait and verify.


Development
-----------

 - Develop in www/index.html and www/js etc.
 - Setup a development server i.e.:
 ```
 $ python -m SimpleHTTPServer
 ```

 - Navigate to localhost/www/main.html to see your changes in effect
 - To test cordova specific functionality connect your phone and run:
 ```
 $ cordova run android
 ```

 Console output can be seen in eclipse or xcode. For convenience filter the messages on com.nens.bui
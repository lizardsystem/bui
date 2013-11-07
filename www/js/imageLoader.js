function buildAnimationDatetimes () {
        // Build datetime objects to retrieve wms layers later on.
    var hours = 3 * 60;
    var animationDatetimes = [];
    var now = moment();
    console.debug("Now = ", now.format('YYYY-MM-DDTHH:mm:ss'));
    
    // The wms only accepts requests for every 5th minute exact
    now.minutes((Math.round(now.minutes()/5) * 5) % 60);
    now.seconds(0);
    console.debug("Now rounded = ", now.format('YYYY-MM-DDTHH:mm:ss'));

    for (var interval = 5; interval < hours; interval = interval + 5) {
        var animationDatetime =  now.subtract('minutes', 5);
        var UtsieAniDatetime = moment.utc(animationDatetime);
        animationDatetimes.push(UtsieAniDatetime.format('YYYY-MM-DDTHH:mm:ss') + '.000Z');
        }

    animationDatetimes.reverse();
    console.debug(animationDatetimes.length);
    return animationDatetimes;
}

function init(){
    setTimeout(function() {
        navigator.splashscreen.hide();
    }, 2000);
    var animationDatetimes = buildAnimationDatetimes();
    document.addEventListener("deviceready", onDeviceReady(animationDatetimes), false);
}

function onDeviceReady (animationDatetimes) {

    var imageUrlBase = 'http://regenradar.lizard.net/wms/?WIDTH=525&HEIGHT=497&SRS=EPSG%3A3857&BBOX=147419.974%2C6416139.595%2C1001045.904%2C7224238.809&TIME=';

    window.radarImages = [];

    gotFile = function (file) {
        console.debug("Got dummy file");
        var sPath = file.fullPath.replace("test.png","");
        var fileTransfer = new FileTransfer();
        console.log("Ready to download some files!");

        //encodeURI()
        var uri = imageUrlBase + animationDatetimes[0]; //2013-11-04T14%3A00%3A00.000Z
        var filePath = sPath + animationDatetimes[0] + '.png';
        var count = 0;

        var succes = function(entry) {
            count++;
            lastOne = count === animationDatetimes.length ? true: false;
            console.log("COUNT: " + count + " of " + animationDatetimes.length);
            window.radarImages.push(entry.toURL());
            console.log("download complete: " + entry.toURL());
            if (lastOne) {
                window.location='./main.html';
                console.log("Start the show! \n" +  window.radarImages);
            }
        };

        var failure = function(error) {
            count++;
            lastOne = count === animationDatetimes.length ? true: false;
            console.log("download error source " + error.source);
            console.log("download error target " + error.target);
            console.log("upload error code" + error.code);
            if (lastOne) {
                window.location='./main.html';
                console.log("Start the show! \n" +  window.radarImages);
            }
        };

        var lastOne = false;
        for (var i = animationDatetimes.length - 1; i >= 0; i--) {
            uri = imageUrlBase + animationDatetimes[i];
            filePath = sPath + animationDatetimes[i] + '.png';
            fileTransfer.download(
            uri,
            filePath,
            succes,
            failure
            );
        }
        file.remove();
    };

    gotDirectory = function (directory) {
        console.debug("Got Directory, getting or creating a dummy file.");
        directory.getFile("test.png", {create: true, exclusive: false}, gotFile, onFileError);
    };

    removeDirectory = function (directory) {
        console.debug("Got old directory, removing.");
        directory.removeRecursively();
        createDirectory();
    };

    gotFileSystem = function (fileSystem) {
        console.debug("Got Filesystem, removing old directory");
        window.fileSystem = fileSystem;
        fileSystem.root.getDirectory("bui", {create: false}, removeDirectory, createDirectory);
    };

    createDirectory = function () {
        console.debug("Creating new directory");
        window.fileSystem.root.getDirectory("bui", {create: true, exclusive: false}, gotDirectory, onDirectoryError);
    };

    onFileSystemError = function (msg) {
        console.error("No filesystem: ", msg);
    };

    onDirectoryError = function (msg) {
        console.error("Failed creating a directory");
    };

    onFileError = function (msg) {
        console.error("No file: ", msg);
    };

    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFileSystem, onFileSystemError);
    
}

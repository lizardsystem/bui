function init(){
    document.addEventListener("deviceready", onDeviceReady, false);
    }

function onDeviceReady () {
    // Build datetime objects to retrieve wms layers later on.
    var hours = 3 * 60;
    var animationDatetimes = [];
    var now = moment();
    console.debug("Now = ", now.format('YYYY-MM-DDTHH:mm:ss'));
    // The wms only accepts requests for every 5th minute exact
    now.minutes((Math.round(now.minutes()/5) * 5) % 60);
    now.seconds(0);
    console.debug("Now rounded = ", now.format('YYYY-MM-DDTHH:mm:ss'));
    for (var interval=5; interval < hours; interval=interval+5) {
        var animationDatetime =  now.subtract('minutes', 5);
        var UtsieAniDatetime = moment.utc(animationDatetime);
        animationDatetimes.push(UtsieAniDatetime.format('YYYY-MM-DDTHH:mm:ss') + '.000Z');
        }
    animationDatetimes.reverse();
    console.debug(animationDatetimes);

    var imageUrlBase = 'http://regenradar.lizard.net/wms/?WIDTH=525&HEIGHT=497&SRS=EPSG%3A3857&BBOX=147419.974%2C6416139.595%2C1001045.904%2C7224238.809&TIME=';

    var radarImages = [];

    gotFile = function (file) {
        console.debug("Got dummy file");
        var sPath = file.fullPath.replace("test.png","");
        var fileTransfer = new FileTransfer();
        file.remove();

        //encodeURI()
        var uri = 'http://regenradar.lizard.net/wms/?WIDTH=525&HEIGHT=497&SRS=EPSG%3A3857&BBOX=147419.974%2C6416139.595%2C1001045.904%2C7224238.809&TIME=' + 
            animationDatetimes[1]; //2013-11-04T14%3A00%3A00.000Z
        var filePath = sPath + animationDatetimes[1] + '.png';

        console.log("Ready to download some files!");
        fileTransfer.download(
            uri,
            filePath,
            function(entry) {
                console.log(entry.toURL());
                radarImages.push(entry.toURL());
                console.log("download complete: " + entry.fullPath);
                window.location='./main.html';
            },
            function(error) {
                console.log("download error source " + error.source);
                console.log("download error target " + error.target);
                console.log("upload error code" + error.code);
            }
        );
    };

    gotDirectory = function (directory) {
        console.debug("Got Directory, getting or creating a dummy file.");
        directory.getFile("test.png", {create: true, exclusive: false}, gotFile, onFileError);
    };

    removeDirectory = function (directory) {
        console.debug("Got old directory, removing.");
        directory.removeRecursively();
    };

    gotFileSystem = function (fileSystem) {
        console.debug("Got Filesystem, removing old directory and creating new.");
        //fileSystem.root.getDirectory("bui", {create: false}, removeDirectory, directoryDoesNotexist);
        fileSystem.root.getDirectory("bui", {create: true, exclusive: false}, gotDirectory, onDirectoryError);
    };

    onFileSystemError = function (msg) {
        console.error("No filesystem: ", msg);
    };

    onDirectoryError = function (msg) {
        console.error("No directory: ");
    };

    directoryDoesNotexist = function (msg) {
        console.log("Directory does not exist yet: ", msg);
    };

    onFileError = function (msg) {
        console.error("No file: ", msg);
    };

    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFileSystem, onFileSystemError);
    
};

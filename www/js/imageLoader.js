function buildAnimationDatetimes () {
        // Build datetime objects to retrieve wms layers later on.
    var hours = 3 * 60;
    var animationDatetimes = [];
    var now = moment();
    
    // The wms only accepts requests for every 5th minute exact
    now.minutes((Math.round(now.minutes()/5) * 5) % 60);
    now.seconds(0);
    //console.debug("Now rounded = ", now.format('YYYY-MM-DDTHH:mm:ss'));

    for (var interval = 5; interval < hours; interval = interval + 5) {
        var animationDatetime =  now.subtract('minutes', 5);
        var UtsieAniDatetime = moment.utc(animationDatetime);
        animationDatetimes.push(UtsieAniDatetime.format('YYYY-MM-DDTHH:mm:ss') + '.000Z');
        }

    animationDatetimes.reverse();
    return animationDatetimes;
}

function init () {
    document.addEventListener("deviceready", onDeviceReady, false);
}

function onDeviceReady () {
    navigator.splashscreen.show();
    var animationDatetimes = buildAnimationDatetimes();
    var imageUrlBase = 'http://regenradar.lizard.net/wms/?WIDTH=525&HEIGHT=497&SRS=EPSG%3A3857&BBOX=147419.974%2C6416139.595%2C1001045.904%2C7224238.809&TIME=';

    var radarImages = [];

    gotFile = function (file) {
        var sPath = file.fullPath.replace("dummy.png","");
        var fileTransfer = new FileTransfer();

        //encodeURI()
        var uri = encodeURI(imageUrlBase + animationDatetimes[0]); //2013-11-04T14%3A00%3A00.000Z
        var filePath = sPath + animationDatetimes[0].replace(':', '_').replace(':', '_').replace('.', '_') + '.png';
        var count = 0;
        var errorCount = 0;
        var errorMsg = true;

        var succes = function(entry) {
            count++;
            lastOne = count === animationDatetimes.length ? true: false;
            //console.log("COUNT: " + count + " of " + animationDatetimes.length);
            radarImages.push(entry.toURL());
            //console.log("download complete: " + entry.toURL());
            if (lastOne) {
                window.location='./main.html';
                //console.log("Start the show! \n" +  radarImages);
            }
        };

        var failure = function(error) {
            count++;
            errorCount++;
            if (errorCount / animationDatetimes.length > 0.8 && errorMsg) {
                errorMsg = false;
                alert("Er gaat iets mis bij het downloaden van de radarbeelden. Mogelijk is de server tijdelijk onbereikbaar.");
            }
            lastOne = count === animationDatetimes.length ? true: false;
            //console.debug("download error source " + error.source);
            //console.debug("download error target " + error.target);
            //console.debug("upload error code" + error.code);
            if (lastOne) {
                window.location='./main.html';
                //console.debug("Start the show! \n" +  radarImages);
            }
        };

        var lastOne = false;
        for (var i = animationDatetimes.length - 1; i >= 0; i--) {
            uri = imageUrlBase + animationDatetimes[i];
            filePath = sPath + animationDatetimes[i].replace(':', '_').replace(':', '_').replace('.', '_') + '.png';
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
        directory.getFile("dummy.png", {create: true, exclusive: false}, gotFile, onFileError);
    };

    removeDirectory = function (directory) {
        directory.removeRecursively(createDirectory, onDirectoryRemoveError);
    };

    var fileSystemGlobal;

    gotFileSystem = function (fileSystem) {
        fileSystemGlobal = fileSystem;
        fileSystem.root.getDirectory("bui", {create: false}, removeDirectory, createDirectory);
    };

    createDirectory = function () {
        fileSystemGlobal.root.getDirectory("bui", {create: true, exclusive: false}, gotDirectory, onDirectoryError);
    };

    onFileSystemError = function (msg) {
        //console.error("No filesystem: " + msg);
        attempts++;
        getFileSystem();
    };

    onDirectoryError = function (msg) {
        //console.error("Failed creating a directory");
        attempts++;
        getFileSystem();
    };

    onDirectoryRemoveError = function (msg) {
        //console.error("Removing directory failed");
        attempts++;
        getFileSystem();
    };

    onFileError = function (msg) {
        //console.error("No file: " + msg);
        attempts++;
        getFileSystem();
    };


    // if device.connection == good:
    getFileSystem = function () {
        if (attempts < 10) {
            window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFileSystem, onFileSystemError);
        }
        else {
            //console.error("Tried 10 times, filesystem will not bend! All troops: retreat!");
            alert("Er gaat iets mis met het downloaden van de radarbeelden");
            navigator.app.exitApp();
        }
    };
    
    var attempts = 0;

    var nw = navigator.connection.type;
    if (nw === Connection.NONE) {
        //console.debug("No internet, skipping download");
        alert("U bent niet verbonden met internet. het is daarom niet mogelijk (de nieuwste) radarbeelden te tonen");
        window.location='./main.html';
        //console.log("Start the show! \n" +  radarImages);
    }
    else if (nw === Connection.CELL_2G) {
        //console.debug("Slow internet, downloading only a few");
        animationDatetimes = animationDatetimes.slice(0, 10);
        attempts++;
        getFileSystem();
    }
    else if (nw === Connection.CELL_3G) {
        //console.debug("Medium slow internet, downloading only half");
        animationDatetimes = animationDatetimes.slice(0, 20);
        attempts++;
        getFileSystem();
    }
    else {
        attempts++;
        getFileSystem();
    }
}

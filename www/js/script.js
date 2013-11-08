
        // Callbacks to enable geolocation
        var onSuccess = function(position) {
            console.log(position);
            map.setView([position.coords.latitude, position.coords.longitude], 11, {
                animate: true
            });
        };

        // onError Callback receives a PositionError object
        //
        function onError(error) {
            console.error("Geolocating went wrong");

            //alert('code: '    + error.code    + '\n' + 'message: ' + error.message + '\n');
            return true; // fail silently...
        }

        function onBackClickEvent () {
            navigator.app.exitApp();
        }

        function init () {
            if (window.cordova) {
                console.debug("Running as cordova application.\nWMS is loaded from the filesystem.\n");
                document.addEventListener("deviceready", whichImagesAreWeTalking, false);
                document.addEventListener("backbutton", onBackClickEvent, false);
            }
            else {
                console.debug("Running as web application.\nWMS is loaded from original wms source on the fly.\nCordova plugins behave unexpectedly, for debugging purposes only!\n");
                document.addEventListener("DOMContentLoaded", buildRadarURLs());
            }
        }

        function buildRadarURLs() {
            // Build datetime objects to retrieve wms layers later on.
            var imageUrlBase = 'http://regenradar.lizard.net/wms/?WIDTH=525&HEIGHT=497&SRS=EPSG%3A3857&BBOX=147419.974%2C6416139.595%2C1001045.904%2C7224238.809&TIME=';
            var hours = 3 * 60;
            var radarImagesURLs = [];
            var now = moment();
            console.debug("Now = ", now.format('YYYY-MM-DDTHH:mm:ss'));
            
            // The wms only accepts requests for every 5th minute exact
            now.minutes((Math.round(now.minutes()/5) * 5) % 60);
            now.seconds(0);
            console.debug("Now rounded = ", now.format('YYYY-MM-DDTHH:mm:ss'));

            for (var interval = 5; interval < hours; interval = interval + 5) {
                var animationDatetime =  now.subtract('minutes', 5);
                var UtsieAniDatetime = moment.utc(animationDatetime);
                radarImagesURLs.push(imageUrlBase + UtsieAniDatetime.format('YYYY-MM-DDTHH:mm:ss') + '.000Z');
                }

            radarImagesURLs.reverse();
            console.debug(radarImagesURLs.length);
            roll(radarImagesURLs);
        }

        function whichImagesAreWeTalking() {
            var radarImages = [];

            function success(entries) {
                console.log("This is how many entries we have: " + entries.length);
                for (var i=0; i < entries.length; i++) {
                    radarImages.push(entries[i].toURL());
                }
                radarImages.sort();
                navigator.splashscreen.hide();
                roll(radarImages);
            }

            function fail(error) {
                alert("Failed to list directory contents: " + error.code);
            }

            gotDirectory = function (dir) {
                // Get a directory reader
                var directoryReader = dir.createReader();

                // Get a list of all the entries in the directory
                directoryReader.readEntries(success,fail);
            };

            gotFileSystem = function (fileSystem) {
                console.debug("Got Filesystem, getting directory");
                fileSystem.root.getDirectory("bui", {create: false}, gotDirectory, dirError);
            };

            onFileSystemError = function (msg) {
                console.error("No filesystem: ", msg);
            };

            dirError = function (msg) {
                console.error("Failed getting the directory");
            };

            window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFileSystem, onFileSystemError);
        }

        function roll(radarImages) {
            var map = null;
            var imageBounds = [[54.28458617998074, 1.324296158471368], [49.82567047026146, 8.992548357936204]];
            console.log(radarImages);
            var interval_ms = 150;
            var cycle_layers_interval = null;
            var current_layer_idx = -1;
            var initialImageUrl = radarImages[0];
            var oldLayer = L.imageOverlay(initialImageUrl, imageBounds, {zIndex: 9999, opacity: 0.8});
            var newRadarImage = undefined;
            var imageUrl = undefined;

            function set_layer (layer_idx) {
                imageUrl = radarImages[layer_idx];
                newRadarImage = L.imageOverlay(imageUrl, imageBounds, {zIndex: 9999, opacity: 0});
                console.log("Adding new layer");
                newRadarImage.on('load', removePreviousLayers);
                newRadarImage.addTo(map);
                current_layer_idx = layer_idx;
                changeClock(imageUrl.slice(-28, -9));
            }

            function removePreviousLayers (e) {
                console.log("Current Layers: ", map._layers);
                newRadarImage.setOpacity(0.8);
                for (var i in map._layers) {
                    if (map._layers[i]._url !== imageUrl && map._layers[i]._url !== "tiles/{z}/{x}/{y}.png") {
                        console.debug("removing: ", map._layers[i]);
                        map.removeLayer(map._layers[i]);
                    }
                }
                console.log("Remaining Layers: ", map._layers);
            }
                    

            function cycle_layers () {
                console.debug(current_layer_idx + " " + radarImages.length);
                var next_layer_idx = current_layer_idx === radarImages.length -1 ? 0 : current_layer_idx + 1;
                changeClock(radarImages[next_layer_idx].slice(-28, -9));
                console.debug(next_layer_idx);
                if (next_layer_idx === 0) {
                    console.log("Waiting " + 5 * interval_ms + "ms");
                    setTimeout(function () {set_layer(next_layer_idx)}, 5 * interval_ms);
                }
                else {
                    set_layer(next_layer_idx);
                }
            }

            function init_slider () {
                var has_hold = false;
                var slideLayerBackwards = function () {
                    console.debug("Going one down: ", current_layer_idx);
                    set_layer(current_layer_idx - 1);
                };

                var slider = document.getElementById("slider");
                var hammertime = Hammer(slider);
                var previous_drag = 0;

                hammertime.on("drag", function(ev) {
                    ev.gesture.preventDefault();
                    console.debug(ev.gesture.deltaX);
                    // Check direction and move every tenth pixel
                    if (ev.gesture.deltaX > (previous_drag+10) && current_layer_idx < radarImages.length-1) {
                        cycle_layers();
                        previous_drag = ev.gesture.deltaX;
                    }
                    if (ev.gesture.deltaX < (previous_drag-10) && current_layer_idx > 0) {
                        slideLayerBackwards();
                        previous_drag = ev.gesture.deltaX;
                    }
                    ev.stopPropagation();

                });

                hammertime.on("dragstart", function(ev) {
                    ev.gesture.preventDefault();
                    previous_drag = 0;
                    ev.stopPropagation();
                });

                hammertime.on("tap", function(ev) {
                    ev.gesture.preventDefault();
                    
                    toggle();

                    ev.stopPropagation();
                });

                hammertime.on("hold", function (ev) {
                    console.debug("Holding on");
                    if (has_hold) {

                        map.setView([51.7, 5.5], 7, {
                            animate: true
                        });
                        has_hold = false;
                        if (window.innerHeight > 800) {
                            console.log("big 'ol screen zooming in");
                            map.ZoomIn(1);
                        }
                    }
                    else if (!has_hold) {
                        console.debug("Geolocating");
                        navigator.geolocation.getCurrentPosition(onSuccess, onError);
                        has_hold = true;
                    }
                });
            }

            function start () {
                cycle_layers_interval = setInterval(cycle_layers, interval_ms);
            }

            function stop () {
                clearInterval(cycle_layers_interval);
                cycle_layers_interval = null;
            }

            function is_running () {
                return cycle_layers_interval !== null;
            }

            function toggle () {
                if (is_running()) {
                    stop();
                }
                else {
                    start();
                }
            }

            function init_map () {
                map = L.map('map', {
                    minZoom: 7,
                    maxZoom: 12,
                    maxBounds: [
                       [55, 9],
                       [45, 0]
                       ],
                    attributionControl: false,
                    zoomControl: false
                });

                map.fitBounds([
                    [53.81362579235235, 7.569580078124999],
                    [50.085344397538876, 3.40576171875]
                    ]);

                oldLayer.addTo(map);
                current_layer_idx = 0;

                map.on('zoomstart', onZoomstart);

                function onZoomstart () {
                    if (is_running()) {
                        stop();
                        map.addOneTimeEventListener('zoomend', onZoomend);
                    }
                }

                function onZoomend () {
                    start();
                }

                map.on('zoom', function (e) {
                    if (map.getZoom() > 7) {
                        map.setMaxBounds([
                        [53.8, 7.4],
                        [49.7, 2.8]
                        ]);
                    }
                    else {
                        map.setMaxBounds([
                        [55, 9],
                        [45, 0]
                        ]);
                    }
                });

                L.tileLayer('tiles/{z}/{x}/{y}.png').addTo(map);

                if (window.innerHeight > 800) {
                    console.log("big 'ol screen zooming in");
                    map.zoomIn(1);
                }

                window.map = map;
            };

            // Start clock
            var clock = document.getElementById('clock');
            var clockGroup, fields, height, offSetX, offSetY, pi, render, scaleHours, scaleMins, vis, width;

            fields = function(layer_datetime) {
                var data, hour, minute, second;
                if (layer_datetime !== undefined) {
                    console.log(layer_datetime);
                    var minuteStr = layer_datetime.slice(14,16);
                    console.debug(minuteStr);
                    minute = Number(minuteStr);
                    console.debug("Settings minutes: " + minute);
                    hour = Number(layer_datetime.slice(11,13)) + 1 + minute / 60; //Convert to local time WARNING: change this line atleast once every season! Cowboy programming by reuring
                    console.debug("Settings hours: " + hour);
                }
                else {
                    minute = 0;
                    hour = 12;
                }
                return data = [
                  {
                    "unit": "minutes",
                    "numeric": minute
                  }, {
                    "unit": "hours",
                    "numeric": hour
                  }
                ];
                };

                width = 90;
                height = 90;
                offSetX = 45;
                offSetY = 45;
                pi = Math.PI;
                
                scaleMins = d3.scale.linear().domain([0, 59 + 59 / 60]).range([0, 2 * pi]);
                scaleHours = d3.scale.linear().domain([0, 11 + 59 / 60]).range([0, 2 * pi]);
                vis = d3.selectAll(".chart").append("svg:svg").attr("width", width).attr("height", height);
                clockGroup = vis.append("svg:g").attr("transform", "translate(" + offSetX + "," + offSetY + ")");
                clockGroup.append("svg:circle").attr("r", 40).attr("fill", "none").attr("class", "clock outercircle").attr("opacity", "1").attr("stroke", "white").attr("stroke-width", 4);
                clockGroup.append("svg:circle").attr("r", 3).attr("fill", "white").attr("class", "clock innercircle").attr("opacity", "1");

            initRender = function(data) {
                var hourArc, minuteArc;
                
                minuteArc = d3.svg.arc().innerRadius(0).outerRadius(35).startAngle(function(d) {
                  return scaleMins(d.numeric);
                }).endAngle(function(d) {
                  return scaleMins(d.numeric);
                });

                hourArc = d3.svg.arc().innerRadius(0).outerRadius(25).startAngle(function(d) {
                  return scaleHours(d.numeric % 12);
                }).endAngle(function(d) {
                  return scaleHours(d.numeric % 12);
                });

                return clockGroup.selectAll(".clockhand").data(data).enter().append("svg:path").attr("d", function(d) {
                  if (d.unit === "minutes") {
                    return minuteArc(d);
                  } else if (d.unit === "hours") {
                    return hourArc(d);
                  }
                }).attr("class", "clockhand").attr("opacity", "1").attr("stroke", "white").attr("stroke-linecap", "round")
                .attr("stroke-width", function(d) {
                  if (d.unit === "seconds") {
                    return 2;
                  } else if (d.unit === "minutes") {
                    return 3;
                  } else if (d.unit === "hours") {
                    return 5;
                  }
                }).attr("fill", "none");
            };

            render = function (data) {
                console.debug("Changing clock");
                var hourArc, minuteArc;

                minuteArc = d3.svg.arc().innerRadius(0).outerRadius(35).startAngle(function(d) {
                  return scaleMins(d.numeric);
                }).endAngle(function(d) {
                  return scaleMins(d.numeric);
                });

                hourArc = d3.svg.arc().innerRadius(0).outerRadius(25).startAngle(function(d) {
                  return scaleHours(d.numeric % 12);
                }).endAngle(function(d) {
                  return scaleHours(d.numeric % 12);
                });

                return clockGroup.selectAll(".clockhand")
                    .data(data).transition().duration(interval_ms.toString()).ease("linear", 1, 0.8)
                    .attr("d", function(d) {
                        if (d.unit === "minutes") {
                            return minuteArc(d);
                        } else if (d.unit === "hours") {
                            return hourArc(d);
                        }
                }).attr("stroke-linecap", "round");
            };

            var initClock = function(layer_datetime) {
                var data;
                data = fields(layer_datetime);
                return initRender(data);
            };

            var changeClock = function(layer_datetime) {
                var data;
                data = fields(layer_datetime);
                moveClock();
                return render(data);
            };

            function moveClock () {
                var clock = document.getElementById("clock");
                var max_width = window.innerWidth - 90;
                var left = current_layer_idx/radarImages.length * (0.98 * max_width);
                clock.style.left = left.toString() + "px";
            }
            // End clock

            function init_neerslagradar () {
                init_map();
                init_slider();
                initClock(initialImageUrl.slice(-28, -9));
                //init_cycle_layers();
                //wait_until_first_layer_loaded();
                //start_when_all_layers_are_loaded();
                start();

                }

            init_neerslagradar();

            }

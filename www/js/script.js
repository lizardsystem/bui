
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
            alert('code: '    + error.code    + '\n' + 'message: ' + error.message + '\n');
            return true; // fail silently...
        }

        function init () {
            if (window.cordova) {
                console.debug("Running as cordova application.\nWMS is loaded from the filesystem.\n");
                document.addEventListener("deviceready", whichImagesAreWeTalking(), false);
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
            var interval_ms = 250;
            var cycle_layers_interval = null;
            var current_layer_idx = -1;
            var initialImageUrl = radarImages[0];
            var oldLayer = L.imageOverlay(initialImageUrl, imageBounds, {zIndex: 9999, opacity: 0.6});
            var newRadarImage = undefined;
            //var define = 0;

            function set_layer (layer_idx) {
                var imageUrl = radarImages[layer_idx];
                newRadarImage = L.imageOverlay(imageUrl, imageBounds, {zIndex: 9999, opacity: 0});
                console.log("Adding new layer");
                newRadarImage.on('load', removePreviousLayers);
                newRadarImage.addTo(map);
                current_layer_idx = layer_idx;
                changeClock(imageUrl.slice(-24, -5));
            }

            function removePreviousLayers (e) {
                console.log(map._layers);
                console.log("Thou shall removeth the old layer!", e);
                newRadarImage.setOpacity(0.6);
                map.removeLayer(oldLayer);
                oldLayer = newRadarImage;
            }
                    

            function cycle_layers () {
                console.debug(current_layer_idx + " " + radarImages.length);
                var next_layer_idx = current_layer_idx === radarImages.length -1 ? 0 : current_layer_idx + 1;
                console.debug(next_layer_idx);
                if (next_layer_idx === 0) {
                    //window.setTimeout(console.log("waiting 1000 ms"), 1000);
                    set_layer(next_layer_idx);
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
                    // Check direction and move every fifth pixel
                    if (ev.gesture.deltaX > (previous_drag+5) && current_layer_idx < radarImages.length-1) {
                        cycle_layers();
                        previous_drag = ev.gesture.deltaX;
                    }
                    if (ev.gesture.deltaX < (previous_drag-5) && current_layer_idx > 0) {
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
                    if (has_hold) {

                    map.setView([51.7, 5.5], 7, {
                        animate: true
                    });
                        has_hold = false;
                    }
                    else if (!has_hold) {
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

            function wait_until_first_layer_loaded () {
                var wait_interval;
                var tick = function () {
                    if (layers[0] && layers[0].ol_layer && !layers[0].ol_layer.loading) {
                        //set clock
                        initClock(layers[0]);
                        set_layer(0);
                        // stop self
                        clearInterval(wait_interval);
                    }
                };
                wait_interval = setInterval(tick, 200);
            }

            function start_when_all_layers_are_loaded () {
                var wait_interval;
                var tick = function () {
                    if (layers_loading === 0) {
                        start();
                        // stop self
                        clearInterval(wait_interval);
                    }
                };
                wait_interval = setInterval(tick, 100);
            }


            function on_layer_loading_change () {
                // update clock
            }

            function init_map () {
                map = L.map('map', {
                    center: [51.7, 5.5],
                    zoom: 7,
                    minZoom: 7,
                    maxZoom: 12,
                    maxBounds: [
                       [55, 9],
                       [45, 0]
                       ],
                    attributionControl: false,
                    zoomControl: false
                });
                
                oldLayer.addTo(map);
                current_layer_idx = 0;

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

                window.map = map;
            };

            // Start clock
            var clock = document.getElementById('clock');
            var clockGroup, fields, height, offSetX, offSetY, pi, render, scaleHours, scaleMins, vis, width;

            fields = function(layer_datetime) {
                var data, hour, minute, second;
                if (layer_datetime !== undefined) {
                    console.log(layer_datetime);
                    minute = parseInt(layer_datetime.slice(14,16));
                    hour = parseInt(layer_datetime.slice(11,13)) + 1 + minute / 60; //Convert to local time WARNING: change this line atleast once every season! Cowboy programming by reuring
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

                width = 163;
                height = 163;
                offSetX = 81;
                offSetY = 81;
                pi = Math.PI;
                
                scaleMins = d3.scale.linear().domain([0, 59 + 59 / 60]).range([0, 2 * pi]);
                scaleHours = d3.scale.linear().domain([0, 11 + 59 / 60]).range([0, 2 * pi]);
                vis = d3.selectAll(".chart").append("svg:svg").attr("width", width).attr("height", height);
                clockGroup = vis.append("svg:g").attr("transform", "translate(" + offSetX + "," + offSetY + ")");
                clockGroup.append("svg:circle").attr("r", 80).attr("fill", "none").attr("class", "clock outercircle").attr("stroke", "lightgray").attr("stroke-width", 2);
                clockGroup.append("svg:circle").attr("r", 4).attr("fill", "lightgray").attr("class", "clock innercircle");

            initRender = function(data) {
                var hourArc, minuteArc;
                
                minuteArc = d3.svg.arc().innerRadius(0).outerRadius(70).startAngle(function(d) {
                  return scaleMins(d.numeric);
                }).endAngle(function(d) {
                  return scaleMins(d.numeric);
                });

                hourArc = d3.svg.arc().innerRadius(0).outerRadius(50).startAngle(function(d) {
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
                }).attr("class", "clockhand").attr("stroke", "lightgray")
                .attr("stroke-width", function(d) {
                  if (d.unit === "seconds") {
                    return 2;
                  } else if (d.unit === "minutes") {
                    return 1;
                  } else if (d.unit === "hours") {
                    return 2;
                  }
                }).attr("fill", "none");
            };

            render = function (data) {
                console.debug("Changing clock");
                var hourArc, minuteArc;

                minuteArc = d3.svg.arc().innerRadius(0).outerRadius(70).startAngle(function(d) {
                  return scaleMins(d.numeric);
                }).endAngle(function(d) {
                  return scaleMins(d.numeric);
                });

                hourArc = d3.svg.arc().innerRadius(0).outerRadius(50).startAngle(function(d) {
                  return scaleHours(d.numeric % 12);
                }).endAngle(function(d) {
                  return scaleHours(d.numeric % 12);
                });

                return clockGroup.selectAll(".clockhand")
                    .data(data).transition().duration("150").ease("elastic", 1, 0.8)
                    .attr("d", function(d) {
                        if (d.unit === "minutes") {
                            return minuteArc(d);
                        } else if (d.unit === "hours") {
                            return hourArc(d);
                        }
                });
            };

            var initClock = function(layer_datetime) {
                var data;
                data = fields(layer_datetime);
                return initRender(data);
            };

            var changeClock = function(layer_datetime) {
                var data;
                data = fields(layer_datetime);
                return render(data);
            };
            // End clock

            function init_neerslagradar () {
                init_map();
                init_slider();
                initClock(initialImageUrl.slice(-24, -5));
                //init_cycle_layers();
                //wait_until_first_layer_loaded();
                //start_when_all_layers_are_loaded();
                start();
                }

            init_neerslagradar();

            }

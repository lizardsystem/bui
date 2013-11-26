        function onBackClickEvent () {
            navigator.app.exitApp();
        }

        function onHomeClickEvent () {
            stop ();
        }

        function getHelp() {
            var helpDiv = document.getElementById('help');
            helpDiv.style.zIndex = 999999;
            helpDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
            document.getElementById('question-icon').style.visibility = 'hidden';
            return true;
        }
        function closeHelp() {
            var helpDiv = document.getElementById('help');
            helpDiv.style.backgroundColor = 'rgba(0,0,0,0)';
            helpDiv.style.zIndex = -100;
            document.getElementById('question-icon').style.visibility = 'visible';
            return true;
        }

        function init () {
            if (window.cordova) {
                //console.debug("Running as cordova application.\nWMS is loaded from the filesystem.\n");
                document.addEventListener("deviceready", whichImagesAreWeTalking, true);
                document.addEventListener("backbutton", onBackClickEvent, false);
            }
            else {
                //console.debug("Running as web application.\nWMS is loaded from original wms source on the fly.\nCordova plugins behave unexpectedly, for debugging purposes only!\n");
                document.addEventListener("DOMContentLoaded", buildRadarURLs());
            }
        }

        function buildRadarURLs() {
            // Build datetime objects to retrieve wms layers later on.
            var imageUrlBase = 'http://regenradar.lizard.net/wms/?WIDTH=525&HEIGHT=497&SRS=EPSG%3A3857&BBOX=147419.974%2C6416139.595%2C1001045.904%2C7224238.809&TIME=';
            var hours = 3 * 60;
            var radarImagesURLs = [];
            var now = moment();
                        
            // The wms only accepts requests for every 5th minute exact
            now.minutes((Math.round(now.minutes()/5) * 5) % 60);
            now.seconds(0);
            
            for (var interval = 5; interval < hours; interval = interval + 5) {
                var animationDatetime =  now.subtract('minutes', 5);
                var UtsieAniDatetime = moment.utc(animationDatetime);
                radarImagesURLs.push(imageUrlBase + UtsieAniDatetime.format('YYYY-MM-DDTHH:mm:ss') + '.000Z');
                }

            radarImagesURLs.reverse();
            roll(radarImagesURLs);
        }

        function whichImagesAreWeTalking() {
            var radarImages = [];
            var attempts = 0;

            function success(entries) {
                //console.debug("This is how many entries we have: " + entries.length);
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
                fileSystem.root.getDirectory("bui", {create: false}, gotDirectory, dirError);
            };

            onFileSystemError = function (msg) {
                //console.error("No filesystem: ", msg);
                attempts++;
                getFileSystem();
            };

            dirError = function (msg) {
                //console.error("Failed getting the directory");
                attempts++;
                getFileSystem();
            };
            
            getFileSystem = function () {
                if (attempts < 10) {
                    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFileSystem, onFileSystemError);
                }
                else {
                    navigator.splashscreen.hide();
                    roll(radarImages);
                }
            };
            
            attempts++;
            getFileSystem();
        }

        function roll(radarImages) {

            // Actual size on displays differs per device, 
            // therefore it is related to the height of the slider which is 20% of the screen
            var slider = document.getElementById('slider');
            document.getElementById('progress-bar').style.height = 0.03 * slider.offsetHeight + 'px';
            var question = document.getElementById('question');
            question.style.fontSize = slider.offsetHeight / 5 + 'px';
            var retina = slider.offsetHeight < 100;
            //console.debug("retina: " + retina);
            
            var map = null;
            var imageBounds = [[54.28458617998074, 1.324296158471368], [49.82567047026146, 8.992548357936204]];
            var interval_ms = 150;
            var cycle_layers_interval = null;
            var current_layer_idx = -1;
            var initialImageUrl = radarImages[0];
            var oldLayer = L.imageOverlay(initialImageUrl, imageBounds, {zIndex: 9999, opacity: 0.8});
            var newRadarImage = undefined;
            var imageUrl = undefined;
            var acceleroWatch = undefined;

            function set_layer (layer_idx) {
                imageUrl = radarImages[layer_idx];
                newRadarImage = L.imageOverlay(imageUrl, imageBounds, {zIndex: 9999, opacity: 0});
                newRadarImage.on('load', removePreviousLayers);
                newRadarImage.addTo(map);
                current_layer_idx = layer_idx;
                changeClock(imageUrl.slice(-28, -9));
            }

            function removePreviousLayers (e) {
                newRadarImage.setOpacity(0.8);
                for (var i in map._layers) {
                    if (map._layers[i]._url !== imageUrl && map._layers[i]._url !== "tiles/{z}/{x}/{y}.png") {
                        map.removeLayer(map._layers[i]);
                    }
                }
            }
                    
            function cycle_layers () {
                var next_layer_idx = current_layer_idx === radarImages.length -1 ? 0 : current_layer_idx + 1;
                if (next_layer_idx === 0) {
                    set_layer(next_layer_idx);
                    //setTimeout(function () {set_layer(next_layer_idx)}, 5 * interval_ms);
                }
                else {
                    set_layer(next_layer_idx);
                }
            }

            // onError Callback receives a PositionError object
            //
            function onError(error) {
                //console.error("Geolocating went wrong");
                //alert('code: '    + error.code    + '\n' + 'message: ' + error.message + '\n');
                return true; // fail silently...
            }

            slideLayerBackwards = function () {
                if (current_layer_idx > 0) {
                    set_layer(current_layer_idx - 1);
                }
            };

            function init_slider () {
                var has_hold = false;
                var slider = document.getElementById("slider");
                var hammertime = Hammer(slider);
                var previous_drag = 0;

                hammertime.on("drag", function(ev) {
                    ev.gesture.preventDefault();
                    // Check direction and move every tenth pixel
                    if (ev.gesture.deltaX > (previous_drag+15) && current_layer_idx < radarImages.length-1) {
                        cycle_layers();
                        previous_drag = ev.gesture.deltaX;
                    }
                    if (ev.gesture.deltaX < (previous_drag-15) && current_layer_idx > 0) {
                        slideLayerBackwards();
                        previous_drag = ev.gesture.deltaX;
                    }
                    ev.stopPropagation();

                });
                var stopped = false;
                hammertime.on("dragstart", function(ev) {
                    ev.gesture.preventDefault();
                    previous_drag = 0;
                    if (is_running()){
                        onPauseEvent();
                        stopped = true;
                    }
                    else {
                        navigator.accelerometer.clearWatch(acceleroWatch);
                    }
                    ev.stopPropagation();
                });

                hammertime.on("dragend", function(ev) {
                    if (stopped) {
                        start();
                        stopped = false;
                    }
                    else {
                        orientationControl();
                    }
                    ev.stopPropagation();
                });

                hammertime.on("tap", function(ev) {
                    ev.gesture.preventDefault();
                    
                    toggle();

                    ev.stopPropagation();
                });

                hammertime.on("hold", function (ev) {
                    //console.debug("Holding on");
                    if (has_hold) {
                        if (window.innerHeight > 900) {
                            //console.debug("big 'ol screen zooming in");
                            map.setView([51.7, 5.3], 8, {animate: false});
                        }
                        else {
                            map.setView([51.7, 5.3], 7, {animate: false});
                        }
                        has_hold = false;
                    }
                    else if (!has_hold) {
                        //console.debug("Geolocating");
                        navigator.geolocation.getCurrentPosition(function (position) {
                            //console.debug("position: " + position);
                            map.setView([position.coords.latitude, position.coords.longitude], 11, {
                            animate: true
                            });
                        }, onError);
                        has_hold = true;
                    }
                });
            }

            function orientationControl () {
                var time_steps = 0;
                var firstmoveR = true;
                var firstmoveL = true;
                function onSuccess(acceleration) {
                    var mv = acceleration.x;
                    if (mv < -1.5 && current_layer_idx < radarImages.length - 1) {
                        time_steps++;
                        if (firstmoveR) {
                            firstmoveR = false;
                            firstmoveL = true;
                            cycle_layers();
                            time_steps = 0;
                        }
                        else if (time_steps > 2) {
                            cycle_layers();
                            time_steps = 0;
                        }
                        else if (mv < -2 && time_steps > 1) {
                            cycle_layers();
                            time_steps = 0;
                        }
                        else if (mv < -3) {
                            cycle_layers();
                            time_steps = 0;
                        }
                    }
                    else if (mv > 1.5 && current_layer_idx > 0) {
                        time_steps++;
                        if (firstmoveL) {
                            firstmoveL = false;
                            firstmoveR = true;
                            slideLayerBackwards();
                            time_steps = 0;
                        }
                        else if (time_steps > 2) {
                            slideLayerBackwards();
                            time_steps = 0;
                        }
                        else if (mv > 2 && time_steps > 1) {
                            slideLayerBackwards();
                            time_steps = 0;
                        }
                        else if (mv > 3) {
                            slideLayerBackwards();
                            time_steps = 0;
                        }
                    }
                    else {
                        time_steps = 0;
                        firstmoveR = true;
                        firstmoveL = true;
                    }
                }

                function onError () {
                    alert('onError!');
                }

                var options = { frequency: 150 };  // Update often

                acceleroWatch = navigator.accelerometer.watchAcceleration(onSuccess, onError, options);
            }

            function start () {
                cycle_layers_interval = setInterval(cycle_layers, interval_ms);
                navigator.accelerometer.clearWatch(acceleroWatch);
            }

            function onPauseEvent () {
                if (is_running) {
                    stop ();
                }
                navigator.accelerometer.clearWatch(acceleroWatch);
            }

            function stop () {
                clearInterval(cycle_layers_interval);
                orientationControl();
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
                    maxZoom: 11,
                    maxBounds: [
                       [57, 10],
                       [47, 0]
                       ],
                    attributionControl: false,
                    zoomControl: false
                });

                if (window.innerHeight > 900) {
                    //console.debug("big 'ol screen zooming in");
                    map.setView([51.7, 5.3], 8, {animate: false});
                }
                else {
                    map.setView([51.7, 5.3], 7, {animate: false});
                }

                oldLayer.addTo(map);
                current_layer_idx = 0;
                
                map.on('movestart', onMove);

                function onMove () {
                    if (is_running()) {
                        stop();
                        map.addOneTimeEventListener('moveend', onMoveend);
                    }
                }

                function onMoveend () {
                    start();
                }

                L.tileLayer('tiles/{z}/{x}/{y}.png').addTo(map);

                window.map = map;
            }

            // Start clock
            var clock = document.getElementById('clock');
            var clockGroup, fields, height, offSetX, offSetY, pi, render, scaleHours, scaleMins, vis, width;

            fields = function(layer_datetime) {
                var data, hour, minute, second;
                if (layer_datetime !== undefined) {
                    var minuteStr = layer_datetime.slice(14,16);
                    minute = Number(minuteStr);
                    hour = Number(layer_datetime.slice(11,13)) + 1 + minute / 60; //Convert to local time WARNING: change this line atleast once every season! Cowboy programming by reuring
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

                width = retina ? 68 : 135;
                height = retina ? 68 : 135;
                offSetX = retina ? 34 : 68;
                offSetY = retina ? 34 : 68;
                pi = Math.PI;
                
                scaleMins = d3.scale.linear().domain([0, 59 + 59 / 60]).range([0, 2 * pi]);
                scaleHours = d3.scale.linear().domain([0, 11 + 59 / 60]).range([0, 2 * pi]);
                vis = d3.selectAll(".chart").append("svg:svg").attr("width", width).attr("height", height);
                clockGroup = vis.append("svg:g").attr("transform", "translate(" + offSetX + "," + offSetY + ")");
                clockGroup.append("svg:circle").attr("r", function () {
                    return retina ? 30 : 60;}).attr("fill", "none").attr("class", "clock outercircle").attr("opacity", "1").attr("stroke", "black").attr("stroke-width", function () {return retina ? 2 : 4;});
                clockGroup.append("svg:circle").attr("r", function () {return retina ? 2.5 : 5;}).attr("fill", "black").attr("class", "clock innercircle").attr("opacity", "1");

            initRender = function(data) {
                var hourArc, minuteArc;
                
                minuteArc = d3.svg.arc().innerRadius(0).outerRadius( function () {
                    return retina ? 20 : 40;}).startAngle(function(d) {
                  return scaleMins(d.numeric);
                }).endAngle(function(d) {
                  return scaleMins(d.numeric);
                });

                hourArc = d3.svg.arc().innerRadius(0).outerRadius( function () {
                    return retina ? 15 : 30;}).startAngle(function(d) {
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
                }).attr("class", "clockhand").attr("opacity", "1").attr("stroke", "black").attr("stroke-linecap", "round")
                .attr("stroke-width", function(d) {
                  if (d.unit === "seconds") {
                    return 2;
                  } else if (d.unit === "minutes") {
                    return retina ? 1.5 : 3;
                  } else if (d.unit === "hours") {
                    return retina ? 2.5 : 5;
                  }
                }).attr("fill", "none");
            };

            render = function (data) {
                var hourArc, minuteArc;

                minuteArc = d3.svg.arc().innerRadius(0).outerRadius( function () {
                    return retina ? 20 : 40;}).startAngle(function(d) {
                  return scaleMins(d.numeric);
                }).endAngle(function(d) {
                  return scaleMins(d.numeric);
                });

                hourArc = d3.svg.arc().innerRadius(0).outerRadius( function () {
                    return retina ? 15 : 30;}).startAngle(function(d) {
                  return scaleHours(d.numeric % 12);
                }).endAngle(function(d) {
                  return scaleHours(d.numeric % 12);
                });

                return clockGroup.selectAll(".clockhand")
                    .data(data).transition().duration(interval_ms.toString()).ease("elastic", 1, 0.8)
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
                moveBar();
                return render(data);
            };

            function moveBar () {
                var bar = document.getElementById("progress-bar");
                parent = bar.parentNode;
                var max_width = parent.offsetWidth;
                var left = current_layer_idx/(radarImages.length-1) * (max_width - bar.offsetWidth);
                bar.style.left = left.toString() + "px";
                if (left === 0) {
                    bar.style.borderRadius = "5px 0 0 0";
                }
                else if (left === max_width - bar.offsetWidth) {
                    bar.style.borderRadius = "0 5px 0 0";
                }
                else {
                    bar.style.borderRadius = "0";
                }
            }
            // End clock


            function init_neerslagradar () {
                document.getElementById('gesture-animation').style.width = '50%';
                init_map();
                init_slider();
                initClock(initialImageUrl.slice(-28, -9));
                start();
                document.addEventListener("pause", onPauseEvent, false);
                }

            init_neerslagradar();

            }

window.onload = init();
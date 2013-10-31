
        // Callbacks to enable geolocation
        var onSuccess = function(position) {
            map.setCenter(
                new OpenLayers.LonLat(position.coords.longitude, position.coords.latitude).transform(
                    new OpenLayers.Projection("EPSG:4326"),
                    map.getProjectionObject()
                ),
            11);
        };

        // onError Callback receives a PositionError object
        //
        function onError(error) {
            alert('code: '    + error.code    + '\n' + 'message: ' + error.message + '\n');
            return true; // fail silently...
        }

        (function () {
            var map = null;
            wms_base_url = 'http://regenradar.lizard.net/wms/';
            fixed_image_layer_bbox = '147419.974, 6416139.595, 1001045.904, 7224238.809';
            
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

            function MyLayer (dt, opacity, bbox) {
                this.dt = dt;
                this.opacity = opacity;
                this.bbox = bbox;
                this.ol_layer = null;
            }

            var CssHideableImageLayer = OpenLayers.Class(OpenLayers.Layer.Image, {
                cssVisibility: true,

                initialize: function (name, url, extent, size, options) {
                    OpenLayers.Layer.Image.prototype.initialize.apply(
                        this, [name, url, extent, size, options]);
                    if (options.cssVisibility === true || options.cssVisibility === false) {
                        this.cssVisibility = options.cssVisibility;
                    }
                    this.events.on({
                        'added': this.updateCssVisibility,
                        'moveend': this.updateCssVisibility,
                        scope: this});
                },

                destroy: function () {
                    this.events.un({
                        'added': this.updateCssVisibility,
                        'moveend': this.updateCssVisibility,
                        scope: this});
                    OpenLayers.Layer.Image.prototype.destroy.apply(this);
                },

                setCssVisibility: function (visible) {
                    this.cssVisibility = visible;
                    this.updateCssVisibility();
                },

                updateCssVisibility: function () {
                    if (this.div) {
                        if (this.cssVisibility) {
                            $(this.div).show();
                        }
                        else {
                            $(this.div).hide();
                        }
                    }
                }
            });

            var interval_ms = 350;
            var cycle_layers_interval = null;
            var current_layer_idx = -1;
            var paused_at_end = false;
            var is_first_load = true;

            var layers = [];

            var full_bbox = new OpenLayers.Bounds(
                fixed_image_layer_bbox.split(','));

            for (var i=0; i < animationDatetimes.length; i++) {
                var dt = animationDatetimes[i];
                layers.push(new MyLayer(dt, 0.6, full_bbox));
            }

            var layers_loading = 0;
            var progress_interval = null;

            function set_layer (layer_idx) {
                if (current_layer_idx != layer_idx) {
                    // swap out visibility
                    if (current_layer_idx != -1) {
                        var current_layer = layers[current_layer_idx];
                        current_layer.ol_layer.setCssVisibility(false);
                    }
                    if (layer_idx != -1) {
                        var layer = layers[layer_idx];
                        layer.ol_layer.setCssVisibility(true);
                        changeClock(layer);
                        //console.debug("Switch to layer: ", layer)
                    }

                    // update with next layer index
                    current_layer_idx = layer_idx;
                }
            }

            function cycle_layers () {
                var current_layer = layers[current_layer_idx];
                // don't swap layers when we're still loading
                if ((!current_layer || !current_layer.ol_layer.loading) &&
                    (!paused_at_end)) {
                    // figure out next layer
                    var next_layer_idx = (current_layer_idx >= layers.length - 1) ? 0 : current_layer_idx + 1;
                    if (next_layer_idx === 0) {
                        paused_at_end = true;

                        setTimeout(function () { paused_at_end = false; set_layer(0); }, 1000);
                        set_layer(next_layer_idx);
                    }
                    else {
                        set_layer(next_layer_idx);
                    }
                }
            }

            function init_cycle_layers () {
                var init_layer = function (idx, layer) {
                    var dt_iso_8601 = layer.dt;
                    var wms_params = {
                        WIDTH: 525,
                        HEIGHT: 497,
                        SRS: 'EPSG:3857',
                        BBOX: layer.bbox.toBBOX(),
                        TIME: dt_iso_8601
                    };
                    var wms_url = wms_base_url + '?' + $.param(wms_params);
                    var ol_layer = new CssHideableImageLayer(
                        'L' + idx,
                        wms_url,
                        layer.bbox,
                        new OpenLayers.Size(525, 497),
                        {
                            isBaseLayer: false,
                            alwaysInRange: true,
                            visibility: true, // keep this, so all layers are preloaded in the browser
                            cssVisibility: false, // hide layer again with this custom option
                            displayInLayerSwitcher: false,
                            metadata: layer,
                            opacity: layer.opacity,
                            eventListeners: {
                                'loadstart': function () {
                                    layers_loading++;
                                    //on_layer_loading_change();
                                },
                                'loadend': function () {
                                    layers_loading--;
                                    //on_layer_loading_change();
                                }
                            },
                            projection: 'EPSG:3857'
                        }
                    );
                    map.addLayer(ol_layer);
                    layer.ol_layer = ol_layer;
                };
                $.each(layers, init_layer);
            }

            function init_slider () {
                var has_hold = false;
                var slideLayerBackwards = function () {
                    console.debug("Going one down: ", current_layer_idx);
                    set_layer(current_layer_idx - 1);
                };

                var hammertime = $("#slider").hammer();
                var previous_drag = 0;
                hammertime.on("drag", function(ev) {
                    ev.gesture.preventDefault();
                    console.debug(ev.gesture.deltaX);
                    // Check direction and move every fifth pixel
                    if (ev.gesture.deltaX > (previous_drag+5) && current_layer_idx < layers.length-1) {
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

                    map.zoomToExtent([
                            344746,
                            6426965,
                            814375,
                            7111840
                        ], {closest: true});
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
                map = new OpenLayers.Map('map', {
                    theme: null,
                    minZoomLevel: 7,
                    maxZoomLevel: 12,
                    controls: [
                        new OpenLayers.Control.TouchNavigation({
                        dragPanOptions: {
                        enableKinetic: true
                        }
                        }),
                        ]
                });
                window.map = map;
                
                var grey = new OpenLayers.Layer.XYZ(
                "Dark Grey",
                [
                    "tiles/${z}/${x}/${y}.png"
                    // "http://a.tiles.mapbox.com/v3/examples.map-8ly8i7pv/${z}/${x}/${y}.png",
                    // "http://b.tiles.mapbox.com/v3/examples.map-8ly8i7pv/${z}/${x}/${y}.png",
                    // "http://c.tiles.mapbox.com/v3/examples.map-8ly8i7pv/${z}/${x}/${y}.png",
                    // "http://d.tiles.mapbox.com/v3/examples.map-8ly8i7pv/${z}/${x}/${y}.png"
                ], {
                    attribution: "",
                    sphericalMercator: true,
                    wrapDateLine: true,
                    transitionEffect: 'resize',
                }
                );
                map.addLayer(grey);
                map.zoomToExtent([
                        344746,
                        6426965,
                        814375,
                        7111840
                    ], {closest: true});
            }

            // Start clock
            var clock = document.getElementById('clock');
            var clockGroup, fields, height, offSetX, offSetY, pi, render, scaleHours, scaleMins, vis, width;

            fields = function(layer) {
                var data, hour, minute, second;
                if (layer !== undefined) {
                    console.log(layer.dt);
                    minute = parseInt(layer.dt.slice(14,16));
                    hour = parseInt(layer.dt.slice(11,13)) + 1 + minute / 60; //Convert to local time WARNING: change this line atleast once every season! Cowboy programming by reuring
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
                }).attr("class", "clockhand").attr("stroke", function() {
                  if (current_layer_idx === layers.length - 1) {
                    return "blue";
                    }
                  else {
                    return "lightgray";
                    }
                }).attr("stroke-width", function(d) {
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

            var initClock = function(layer) {
                var data;
                data = fields(layer);
                return initRender(data);
            };

            var changeClock = function(layer) {
                var data;
                data = fields(layer);
                return render(data);
            };
            // End clock

            function init_neerslagradar () {
                init_map();
                init_slider();
                init_cycle_layers();
                wait_until_first_layer_loaded();
                start_when_all_layers_are_loaded();
                };

            init_neerslagradar();

            })();

        app.initialize();
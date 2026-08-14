(function () {
    "use strict";

    var GEOJSON_URL = "assets/geojson/lebanon-regions.geojson";

    var COLORS = {
        beirut: "#c1121f",
        mountain: "#2a9d8f",
        north: "#264653",
        bekaa: "#e9c46a",
        "west-bekaa": "#f4a261",
        south: "#1d3557"
    };

    var REGION_PAGES = {
        beirut: "beirut.html",
        mountain: "mountain.html",
        north: "north.html",
        bekaa: "bikaa.html",
        "west-bekaa": "west_bikaa.html",
        south: "south.html"
    };

    var REGION_3D = {
        beirut: {
            zoom: 15.1,
            pitch: 64,
            bearing: 72,
            terrain: 0.45,
            fillOpacity: 0.04,
            duration: 2600,
            hold: 4600,
            offset: { lng: -0.018, lat: -0.004 }
        },
        mountain: {
            zoom: 10.2,
            pitch: 58,
            bearing: -18,
            terrain: 1.9,
            fillOpacity: 0.1,
            duration: 2400,
            hold: 3400,
            offset: { lng: 0, lat: 0 }
        },
        north: {
            zoom: 10,
            pitch: 56,
            bearing: -18,
            terrain: 1.8,
            fillOpacity: 0.1,
            duration: 2400,
            hold: 3400,
            offset: { lng: 0, lat: 0 }
        },
        bekaa: {
            zoom: 10,
            pitch: 55,
            bearing: -12,
            terrain: 1.5,
            fillOpacity: 0.1,
            duration: 2400,
            hold: 3400,
            offset: { lng: 0, lat: 0 }
        },
        "west-bekaa": {
            zoom: 10.6,
            pitch: 55,
            bearing: -12,
            terrain: 1.6,
            fillOpacity: 0.1,
            duration: 2400,
            hold: 3400,
            offset: { lng: 0, lat: 0 }
        },
        south: {
            zoom: 10.2,
            pitch: 56,
            bearing: -18,
            terrain: 1.6,
            fillOpacity: 0.1,
            duration: 2400,
            hold: 3400,
            offset: { lng: 0, lat: 0 }
        }
    };

    // Beirut label sits just west of the tiny city polygon
    var LABEL_OFFSETS = {
        beirut: { lng: -0.008, lat: 0 },
        mountain: { lng: -0.02, lat: 0 },
        north: { lng: 0, lat: 0 },
        bekaa: { lng: 0, lat: 0 },
        "west-bekaa": { lng: 0, lat: 0 },
        south: { lng: 0, lat: 0 }
    };

    var mapLoading = document.getElementById("mapLoading");
    var mapMeta = document.getElementById("mapMeta");
    var overlay = document.getElementById("region3dOverlay");
    var overlayCaption = document.getElementById("region3dCaption");

    function hideLoading() {
        if (mapLoading) mapLoading.classList.add("hidden");
    }

    function showError(message) {
        if (!mapLoading) return;
        mapLoading.classList.remove("hidden");
        mapLoading.textContent = message;
    }

    if (typeof L === "undefined") {
        showError("تعذر تحميل مكتبة الخريطة");
        return;
    }

    if (window.location.protocol === "file:") {
        console.error(
            "[Lahjetna] file:// blocks GeoJSON fetch. Serve with: npx serve -l 8000"
        );
        showError("افتح الخريطة عبر خادم محلي (وليس كملف)");
        return;
    }

    var map = L.map("map", {
        zoomControl: true,
        attributionControl: true,
        minZoom: 7,
        maxZoom: 16,
        maxBoundsViscosity: 1.0
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(map);

    map.createPane("neighborMask");
    map.getPane("neighborMask").style.zIndex = 350;
    map.getPane("neighborMask").style.pointerEvents = "none";

    function reverseRing(ring) {
        return ring.slice().reverse();
    }

    function collectOuterRings(geojson) {
        var rings = [];
        geojson.features.forEach(function (feature) {
            var geom = feature.geometry;
            if (!geom) return;
            if (geom.type === "Polygon") {
                rings.push(reverseRing(geom.coordinates[0]));
            } else if (geom.type === "MultiPolygon") {
                geom.coordinates.forEach(function (poly) {
                    rings.push(reverseRing(poly[0]));
                });
            }
        });
        return rings;
    }

    // Cover everything outside Lebanon so OSM is only visible inside the country.
    function maskOutsideLebanon(geojson) {
        var outer = [
            [20, 20],
            [50, 20],
            [50, 45],
            [20, 45],
            [20, 20]
        ];
        return {
            type: "Feature",
            geometry: {
                type: "Polygon",
                coordinates: [outer].concat(collectOuterRings(geojson))
            }
        };
    }

    function styleFeature(feature) {
        var id = feature.properties.region_id;
        return {
            color: "#1a1a1a",
            weight: 1.5,
            opacity: 1,
            fillColor: COLORS[id] || "#888",
            fillOpacity: 0.45,
            lineJoin: "round"
        };
    }

    function goToRegionPage(feature) {
        var page = REGION_PAGES[feature.properties.region_id];
        if (page) window.location.href = page;
    }

    function openRegion3D(feature, featureLayer) {
        var id = feature.properties.region_id;
        var page = REGION_PAGES[id];
        if (!page) return;

        if (typeof maplibregl === "undefined") {
            goToRegionPage(feature);
            return;
        }

        var cam = REGION_3D[id] || REGION_3D.mountain;
        var boundsCenter = featureLayer.getBounds().getCenter();
        var center = [
            boundsCenter.lng + (cam.offset.lng || 0),
            boundsCenter.lat + (cam.offset.lat || 0)
        ];
        var selectedOnly = {
            type: "FeatureCollection",
            features: [feature]
        };

        if (overlayCaption) {
            overlayCaption.textContent = feature.properties.name_ar;
        }
        if (overlay) {
            overlay.classList.add("is-open");
            overlay.setAttribute("aria-hidden", "false");
        }

        var glMap = new maplibregl.Map({
            container: "region3dMap",
            style: {
                version: 8,
                sources: {
                    satellite: {
                        type: "raster",
                        tiles: [
                            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        ],
                        tileSize: 256,
                        attribution: "Tiles © Esri"
                    },
                    terrain: {
                        type: "raster-dem",
                        tiles: [
                            "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
                        ],
                        encoding: "terrarium",
                        tileSize: 256,
                        maxzoom: 15
                    },
                    selected: {
                        type: "geojson",
                        data: selectedOnly
                    }
                },
                layers: [
                    {
                        id: "background",
                        type: "background",
                        paint: { "background-color": "#1b3a4a" }
                    },
                    { id: "satellite", type: "raster", source: "satellite" },
                    {
                        id: "hillshade",
                        type: "hillshade",
                        source: "terrain",
                        paint: {
                            "hillshade-exaggeration": id === "beirut" ? 0.2 : 0.5,
                            "hillshade-illumination-anchor": "viewport"
                        }
                    },
                    {
                        id: "selected-fill",
                        type: "fill",
                        source: "selected",
                        paint: {
                            "fill-color": COLORS[id] || "#ffffff",
                            "fill-opacity": cam.fillOpacity
                        }
                    },
                    {
                        id: "selected-line",
                        type: "line",
                        source: "selected",
                        paint: {
                            "line-color": "#ffffff",
                            "line-width": id === "beirut" ? 4 : 3,
                            "line-opacity": 0.95
                        }
                    }
                ],
                terrain: {
                    source: "terrain",
                    exaggeration: cam.terrain
                }
            },
            center: center,
            zoom: Math.max(cam.zoom - 2.4, 8),
            pitch: 42,
            bearing: cam.bearing,
            maxPitch: 85,
            interactive: false,
            attributionControl: true
        });

        glMap.on("load", function () {
            glMap.resize();

            try {
                glMap.setSky({
                    "sky-color": "#6ea8c9",
                    "horizon-color": "#cfe3ee",
                    "fog-color": "#d7e6ee"
                });
            } catch (err) {
                // older MapLibre builds may not support setSky
            }

            try {
                glMap.addSource("openmaptiles", {
                    type: "vector",
                    url: "https://tiles.openfreemap.org/planet"
                });
                glMap.addLayer(
                    {
                        id: "3d-buildings",
                        type: "fill-extrusion",
                        source: "openmaptiles",
                        "source-layer": "building",
                        minzoom: 13,
                        paint: {
                            "fill-extrusion-color": "#e8e4dc",
                            "fill-extrusion-height": [
                                "coalesce",
                                ["to-number", ["get", "render_height"]],
                                ["to-number", ["get", "height"]],
                                14
                            ],
                            "fill-extrusion-base": [
                                "coalesce",
                                ["to-number", ["get", "render_min_height"]],
                                ["to-number", ["get", "min_height"]],
                                0
                            ],
                            "fill-extrusion-opacity": 0.94
                        }
                    },
                    "selected-fill"
                );
            } catch (err) {
                console.warn("[Lahjetna] 3D buildings skipped", err);
            }

            glMap.easeTo({
                center: center,
                zoom: cam.zoom,
                pitch: cam.pitch,
                bearing: cam.bearing,
                duration: cam.duration,
                essential: true
            });
        });

        window.setTimeout(function () {
            window.location.href = page;
        }, cam.hold);
    }

    fetch(GEOJSON_URL)
        .then(function (response) {
            if (!response.ok) {
                console.error("[Lahjetna] GeoJSON HTTP", response.status, GEOJSON_URL);
                throw new Error("HTTP " + response.status);
            }
            return response.json();
        })
        .then(function (data) {
            L.geoJSON(maskOutsideLebanon(data), {
                pane: "neighborMask",
                interactive: false,
                style: {
                    fillColor: "#c5dde8",
                    fillOpacity: 1,
                    stroke: false
                }
            }).addTo(map);

            var layer = L.geoJSON(data, {
                style: styleFeature,
                onEachFeature: function (feature, featureLayer) {
                    var name = feature.properties.name_ar;
                    var area = feature.properties.area_km2;
                    featureLayer.bindTooltip(
                        name + " — " + area + " كم²",
                        { sticky: true, direction: "top" }
                    );
                    featureLayer.on("click", function (event) {
                        L.DomEvent.stopPropagation(event);
                        openRegion3D(feature, featureLayer, data);
                    });
                    featureLayer.on("mouseover", function () {
                        featureLayer.setStyle({
                            weight: 2.5,
                            fillOpacity: 0.62
                        });
                    });
                    featureLayer.on("mouseout", function () {
                        featureLayer.setStyle(styleFeature(feature));
                    });
                }
            }).addTo(map);

            data.features.forEach(function (feature) {
                var id = feature.properties.region_id;
                var offset = LABEL_OFFSETS[id] || { lng: 0, lat: 0 };
                var center = [
                    feature.properties.label_lat + offset.lat,
                    feature.properties.label_lng + offset.lng
                ];

                L.marker(center, {
                    interactive: false,
                    zIndexOffset: id === "beirut" ? 500 : 0,
                    icon: L.divIcon({
                        className:
                            "region-label" +
                            (id === "beirut" ? " region-label--beirut" : ""),
                        html: feature.properties.name_ar,
                        iconSize: id === "beirut" ? [56, 28] : [140, 28],
                        iconAnchor: [id === "beirut" ? 56 : 70, 14]
                    })
                }).addTo(map);
            });

            var bounds = layer.getBounds();
            map.fitBounds(bounds, { padding: [48, 48] });
            map.setMaxBounds(bounds.pad(0.05));

            if (mapMeta && data.properties) {
                mapMeta.innerHTML =
                    "<strong>مصدر الحدود:</strong> geoBoundaries ADM2<br>" +
                    "<strong>المساحة المحسوبة:</strong> " +
                    data.properties.computed_total_km2 +
                    " كم²<br>" +
                    "<strong>الرسمية:</strong> " +
                    data.properties.official_area_km2 +
                    " كم²";
            }

            console.log("[Lahjetna] regions loaded", data.properties);
            hideLoading();
        })
        .catch(function (error) {
            console.error("[Lahjetna] failed to load regions", error);
            showError("تعذر تحميل حدود لبنان");
        });
})();

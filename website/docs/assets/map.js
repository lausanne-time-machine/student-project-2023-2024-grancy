
// Create the WMS layer
const carte_1937 = L.tileLayer.wms("https://map.lausanne.ch/mapserv_proxy?", {
    ogcserver: "source for image/png",
    // cache_version: "a661b634fe93457193007cb3c3deab4a",
    //version: '1.3.0',
    layers: 'plans_histo_lsne_1937',
    format: 'image/png',
    //transparent: true,
    //map_resolution: "72.0000010728836",
    //servertype: "mapserver",
    uppercase: "true",
    maxZoom: 27,
    //minZoom: 21,
    attribution: '© Lausanne, <a href="https://www.vd.ch/themes/territoire-et-construction/cadastre-et-geoinformation/geodonnees/commande-de-geodonnees/conditions-dutilisation/" target="_new">Etat de Vaud</a>, <a href="https://www.swisstopo.admin.ch/fr/bases-legales" target="_new">Swisstopo</a>'
});

const carte_1937_transparent = L.tileLayer.wms("https://map.lausanne.ch/mapserv_proxy?", {
    ogcserver: "source for image/png",
    layers: 'plans_histo_lsne_1937',
    format: 'image/png',
    transparent: true,
    uppercase: "true",
    maxZoom: 27,
    attribution: '© Lausanne, <a href="https://www.vd.ch/themes/territoire-et-construction/cadastre-et-geoinformation/geodonnees/commande-de-geodonnees/conditions-dutilisation/" target="_new">Etat de Vaud</a>, <a href="https://www.swisstopo.admin.ch/fr/bases-legales" target="_new">Swisstopo</a>'
});

const zeitreihen = {
    format: 'png',
    layer: 'ch.swisstopo.zeitreihen',
    maxNativeZoom: 26,
}

// 1:25000 1953, 1:50000 1954
const carte_1954 = L.tileLayer.swiss({...zeitreihen, timestamp: '19541231'});

// sous-gare: 1925, reste 1926
const carte_1926 = L.tileLayer.swiss({...zeitreihen, timestamp: '19261231'});

// tout actualisé en 1934
const carte_1934 = L.tileLayer.swiss({...zeitreihen, timestamp: '19341231'});

const directoryTable = document.getElementById("directory_table")

const geoJson2heat = function(geojson, intensity) {
    return geojson.features.map(function(feature) {
    return [parseFloat(feature.geometry.coordinates[1]), 
            parseFloat(feature.geometry.coordinates[0]), intensity];
    });
    };


class Map {
    constructor() {
        this.center = [46.51437, 6.62371]
        this.map = L.map('map', {
            crs: L.CRS.EPSG2056,
            maxBounds: L.latLngBounds(L.latLng(this.center[0] - 0.015, this.center[1] - 0.03), L.latLng(this.center[0] + 0.015, this.center[1] + 0.03)),
            maxBoundsViscosity: 0.5,
            center: this.center,
            zoom: 22,
            maxZoom: 27,
            minZoom: 21,
            layers: [carte_1937]
        
        });
        L.control.scale({
            metric: true,
            imperial: false,
            maxWidth: 200
        }).addTo(this.map);
        this.layers = {
            1954: carte_1954,
            1926: carte_1926,
            1934: carte_1934,
            1937: carte_1937,
            transparent_1937: carte_1937_transparent
        }
        this.backgroundLayers = []
        this.geoJsonLayer = null
        this.directoryTable = new gridjs.Grid({
            columns: ["Nom", "Prénom", "Métier", "Adresse", {name: "coord", hidden: true}],
            data: [],
            height: "70vh",
            fixedHeader: true,
            pagination: {
                limit: 100,
                summary: true
            },
            search: true,
            //sort: true // deactivated as forcerender is buggy with this option set
        }).render(directoryTable)
        this.directoryTable.on('rowClick', (event, data) => this.map.flyTo(data._cells[4].data, 27));
    }

    setBackgroundLayers(layers) {
        this.backgroundLayers.forEach(layer => this.map.removeLayer(layer))
        this.backgroundLayers = layers
        this.backgroundLayers.forEach(layer => this.map.addLayer(layer))
    }

    setJsonLayer(data, people) {
        data.features.forEach(feature => feature.properties.nbpeople=0)
        people.forEach(person => person.feature.properties.nbpeople+=1)
        if(this.geoJsonLayer) this.map.removeLayer(this.geoJsonLayer)
        this.geoJsonLayer = L.geoJSON(data, {
                interactive: true,
                pointToLayer: function(feature, latlng) {
                    const layer = L.marker(latlng, {
                        //title: "feature.properties.nbpeople"
                    }).bindTooltip(feature.properties.nbpeople.toString(), {
                        permanent: false,
                        direction: 'top',offset:L.point(-14, -5)
                    })
                    var popupContent = "<strong>" + feature.getFullAddress() + "</strong><br>" +
                                   "<div id='table-" + feature.getId() + "'></div>";
                    layer.bindPopup(popupContent, {
                        autoPan: true,
                        maxWidth: 600,
                    });
                    layer.on('popupopen', function(event) {
                        new gridjs.Grid({
                            columns: ["Nom", "Prénom", "Métier"],
                            data: feature.getPeople().map(person => [person.lastname, person.firstname, person.job]),
                            className: {
                                container: 'popup-gridjs-container',
                              }
                        }).render(document.getElementById("table-" + feature.getId()));
                        setTimeout(function() {
                            //It's a hack to call a private function, but I don't know how to do otherwise.
                            //As table takes time to generate, the final height is not known when leaflet
                            //automatically calls this function.
                            event.popup._adjustPan();
                        }, 200);
                    });
                    return layer
                }
            }).addTo(this.map)
        if(this.heatLayer && this.heatLayerDisplayed) this.map.removeLayer(this.heatLayer)
            this.heatLayer = L.heatLayer(people.map(person=>person.feature.getLeafletCoord()), {
                radius: 60,
                blur: 15,
                maxZoom: 23,
                max: Math.max(5, people.length/15)
            });
        if(this.heatLayerDisplayed) this.heatLayer.addTo(this.map)
        this.directoryTable.updateConfig({
            data: people.map(person => [person.lastname, person.firstname, person.job, person.feature.getFullAddress(), person.feature.getLeafletCoord()])
        }).forceRender()
    }

    displayHeatLayer(display) {
        if(display===this.heatLayerDisplayed) return
        this.heatLayerDisplayed=display
        if(display && this.heatLayer) this.heatLayer.addTo(this.map)
        if(!display && this.heatLayer) this.map.removeLayer(this.heatLayer)
    }
}

export default Map
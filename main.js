const map = L.map('map').setView([20, 0], 2);

const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// control that shows state info on hover
const info = L.control();

info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
};

function roundToDecimalPlaces(num, decimalPlaces) {
    var factor = Math.pow(10, decimalPlaces);
    return Math.round(num * factor) / factor;
}

info.update = function (props) {
    let contents = 'Hover over a country for detailed<br>information from the World Bank.<br>Click to center!';

    if (props) {
        contents = `<h4>Country Information</h4>
                    <b>${props.WB_NAME}</b><br />
                    Population Density: ${roundToDecimalPlaces(props.density, 2)} people / km<sup>2</sup><br />
                    Last Census Year: ${props.LASTCENSUS}<br />
                    Country Type: ${props.TYPE}<br />
                    Income Group: ${props.INCOME_GRP}<br />
                    Region (WB): ${props.REGION_WB}<br />
                    Region (UN): ${props.REGION_UN}<br />
                    Subregion: ${props.SUBREGION}<br />
                    ISO2 Code: ${props.ISO_A2}<br />
                    ISO3 Code: ${props.ISO_A3}<br />
                    `;
    }

    this._div.innerHTML = contents;
};


info.addTo(map);


// get color depending on population density value
function getColor(d) {
    return d > 200 ? '#d43d51' :
           d > 100 ? '#e47348' :
           d > 50  ? '#e8a451' :
           d > 20  ? '#e5d272' :
           d > 10  ? '#9fbd68' : '#00876c';
}


function style(feature) {
    return {
        weight: 1,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7,
        fillColor: getColor(feature.properties.density)
    };
}

function highlightFeature(e) {
    const layer = e.target;

    layer.setStyle({
        weight: 3,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7
    });

    layer.bringToFront();

    info.update(layer.feature.properties);
}

/* global statesData */
const geojson = L.geoJson(wbData, {
    style,
    onEachFeature
}).addTo(map);

function resetHighlight(e) {
    geojson.resetStyle(e.target);
    info.update();
}

function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
}

function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
    });
}

map.attributionControl.addAttribution('World Boundaries GeoJSON - Very High Resolution from <a href="https://datacatalog.worldbank.org/search/dataset/0038272">World Bank Data</a>');


const legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'info legend');
    div.innerHTML = '<h4>Population Density (km<sup>2</sup>)</h4>';
    
    const grades = [0, 10, 20, 50, 100, 200];
    let from, to;

    for (let i = 0; i < grades.length; i++) {
        from = grades[i];
        to = grades[i + 1];

        div.innerHTML += `<i style="background:${getColor(from + 1)}"></i> ${from}${to ? `&ndash;${to}` : '+'}<br>`;
    }

    return div;
};

legend.addTo(map);


// Extract unique economy values from your geojson data
const uniqueEconomies = Array.from(new Set(wbData.features.map(feature => feature.properties.ECONOMY))).sort();

// Create the dropdown menu control
const EconomyFilterControl = L.Control.extend({
    onAdd: function(map) {
        const div = L.DomUtil.create('div', 'filter-control');
        div.innerHTML = `
            <h3>Select Economy Type</h3>
            <label for="economy-filter"></label>
            <select id="economy-filter">
                <option value="all">All Economies</option>
                ${uniqueEconomies.map(economy => `<option value="${economy}">${economy}</option>`).join('')}
            </select>
        `;
        return div;
    }
});

const economyFilterControl = new EconomyFilterControl({ position: 'topleft' });
economyFilterControl.addTo(map);

// Get the dropdown element
const economyFilter = document.getElementById('economy-filter');

// Event listener for dropdown change
economyFilter.addEventListener('change', function () {

    map.setView([20, 0], 2);

    map.eachLayer(function (layer) {
        if (layer !== tiles) {
            map.removeLayer(layer);
        }
    });

    const selectedEconomy = this.value;

    // Filter geometries based on the selected economy
    const filteredFeatures = wbData.features.filter(feature => selectedEconomy === 'all' || feature.properties.ECONOMY === selectedEconomy);
    
    // Create a new GeoJSON layer with filtered features and add it to the map
    geojson = L.geoJson(filteredFeatures, {
        style,
        onEachFeature
    }).addTo(map);
});

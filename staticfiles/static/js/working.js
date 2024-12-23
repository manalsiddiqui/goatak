class Unit {
    constructor(map, u) {
        this.unit = u;
        this.uid = u.uid;

        if (map) this.updateMarker(map);
    }

    update(map, u) {
        if (this.unit.uid !== u.uid) {
            throw "wrong uid";
        }

        this.redraw = this.needsRedraw(u);

        for (const k of Object.keys(u)) {
            this.unit[k] = u[k];
        }

        this.updateMarker(map);

        return this;
    }

    needsRedraw(u) {
        if (this.unit.type !== u.type || this.unit.sidc !== u.sidc || this.unit.status !== u.status) return true;
        if (this.unit.speed !== u.speed || this.unit.direction !== u.direction) return true;
        if (this.unit.team !== u.team || this.unit.role !== u.role) return true;

        if (this.unit.sidc.charAt(2) === 'A' && this.unit.hae !== u.hae) return true;
        return false;
    }

    isContact() {
        return this.unit.category === "contact"
    }

    isOnline() {
        return this.unit.status === "Online";
    }

    removeMarker(map) {
        if (this.marker) {
            map.removeLayer(this.marker);
            this.marker.remove();
            this.marker = null;
        }
    }

    updateMarker(map) {
        if (!this.hasCoords()) {
            this.removeMarker(map);
            return;
        }

        if (this.marker) {
            if (this.redraw) {
                this.marker.setIcon(getIcon(this.unit, true));
            }
        } else {
            this.marker = L.marker(this.coords(), {draggable: this.local});
            this.marker.setIcon(getIcon(this.unit, true));

            let vm = this;
            this.marker.on('click', function (e) {
                app.setCurrentUnitUid(vm.uid, false);
            });

            if (this.local) {
                this.marker.on('dragend', function (e) {
                    vm.unit.lat = marker.getLatLng().lat;
                    vm.unit.lon = marker.getLatLng().lng;
                });
            }

            this.marker.addTo(map);
        }

        this.marker.setLatLng(this.coords());
        this.marker.bindTooltip(this.popup());
        this.redraw = false;
    }

    hasCoords() {
        return this.unit.lat && this.unit.lon;
    }

    coords() {
        return [this.unit.lat, this.unit.lon];
    }

    latlng() {
        return L.latLng(this.unit.lat, this.unit.lon)
    }

    compare(u2) {
        return this.unit.callsign.toLowerCase().localeCompare(u2.unit.callsign.toLowerCase());
    }

    popup() {
        let v = '<b>' + this.unit.callsign + '</b><br/>';
        if (this.unit.team) v += this.unit.team + ' ' + this.unit.role + '<br/>';
        if (this.unit.speed) v += 'Speed: ' + this.unit.speed.toFixed(0) + ' m/s<br/>';
        if (this.unit.sidc.charAt(2) === 'A') {
            v += "hae: " + this.unit.hae.toFixed(0) + " m<br/>";
        }
        v += this.unit.text.replaceAll('\n', '<br/>').replaceAll('; ', '<br/>');
        return v;
    }

    send() {
        const requestOptions = {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(this.unit)
        };
        fetch("/unit", requestOptions)
            .then(resp => resp.json())
            .then(d => app.processUnit(d));
    }
}



// replaces Vue's data object
let map = null;
let layers = null;
let conn = null;
let status = "";
let units = new Map();
let messages = [];
let seenMessages = new Set();
let ts = 0;
let locked_unit_uid = '';
let current_unit_uid = null;
let config = null;
let tools = new Map();
let me = null;
let coords = null;
let point_num = 1;
let coord_format = "d";
let form_unit = {};
let types = null;
let chatroom = "";
let chat_uid = "";
let chat_msg = "";

function fetchMessages() {
    fetch('/message')
        .then(response => response.json())
        .then(data => {
            appState.messages = data;
            updateMessagesUI();
            console.log('Messages updated:', appState.messages);
        })
        .catch(error => {
            console.error('Failed to fetch messages:', error);
            showError('Failed to load messages.');
        });
}

// Assuming you have an object to store the global state
let appState = {
    messages: [],
    seenMessages: new Set(),
    status: '',
    map: null,
    units: new Map(),
    locked_unit_uid: '',
    ts: 0,
    current_unit_uid: '',
};

// Function to update the messages UI based on the latest state
function updateMessagesUI() {
    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.innerHTML = ''; // Clear current messages
    appState.messages.forEach(msg => {
        const messageElement = document.createElement('div');
        messageElement.textContent = msg.text; // Simplified, add more structure as needed
        messagesContainer.appendChild(messageElement);
    });
}

// Function to show error messages in the UI
function showError(message) {
    const errorContainer = document.getElementById('error-container');
    errorContainer.textContent = message;
    errorContainer.style.display = 'block'; // Make sure this is visible
}

document.addEventListener('DOMContentLoaded', function() {
    fetchMessages(); // Fetch messages when the document is ready
});

function initializeMap() {
    map = L.map('map').setView([60, 30], 11);
    L.control.scale({metric: true}).addTo(map);
}

function getConfig() {
    fetch('/config')
        .then(response => response.json())
        .then(data => {
            config = data;
            // Update the map view and other configurations based on the fetched data
            map.setView([config.lat, config.lon], config.zoom);
            initializeLayers();
        });
}

function initializeLayers() {
    layers = L.control.layers({}, null, {hideSingleBase: true}).addTo(map);
    // Dynamically add layers based on some configuration or predefined settings
}

function setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    conn = new WebSocket(protocol + window.location.host + '/ws');
    conn.onmessage = (e) => processWebSocketMessage(JSON.parse(e.data));
    conn.onopen = () => { console.log("Connected"); status = "connected"; };
    conn.onerror = () => { console.log("WebSocket Error"); status = "error"; };
    conn.onclose = () => { console.log("WebSocket Closed"); status = ""; setTimeout(setupWebSocket, 3000); };
}

function processWebSocketMessage(data) {
    // Handle the data received via websockets
    console.log("WebSocket Data:", data);
}

function handleEvents() {
    map.on('click', mapClick);
    map.on('mousemove', function (e) { coords = e.latlng; });
}

function mapClick(e) {
    if (modeIs("redx")) {
        addOrMove("redx", e.latlng, "/static/icons/x.png");
    }
    // Additional click handlers based on other modes
}

function modeIs(mode) {
    return document.getElementById(mode).checked;
}

function addOrMove(name, coord, icon) {
    let marker = tools.get(name);
    if (marker) {
        marker.setLatLng(coord);
    } else {
        marker = L.marker(coord, {icon: L.icon({iconUrl: icon, iconSize: [20, 20], iconAnchor: [10, 10]})}).addTo(map);
        tools.set(name, marker);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the map
    appState.map = L.map('map').setView([60, 30], 11);
    L.control.scale({ metric: true }).addTo(appState.map);

    // Configure and connect
    getConfig();
    if ('WebSocket' in window || 'MozWebSocket' in window) {
        connect();
    }

    // Data refreshing
    renew(); // Initial renew
    setInterval(renew, 5000); // Regular updates
    setInterval(sender, 1000); // Send data at regular intervals

    // Event handlers for map interactions
    appState.map.on('click', mapClick);
    appState.map.on('mousemove', mouseMove);

    // Initial form setup (if applicable)
    formFromUnit(null);
});

// Definitions of getConfig, connect, renew, sender, mapClick, mouseMove, formFromUnit
function getConfig() {
    fetch('/config')
        .then(response => response.json())
        .then(data => {
            appState.config = data;  // Assume `appState` is your global state object

            // Update map view
            appState.map.setView([data.lat, data.lon], data.zoom);

            // Set up marker for 'me' if callsign is present
            if (data.callsign) {
                appState.me = L.marker([data.lat, data.lon], {
                    icon: L.icon({
                        iconUrl: "/static/icons/self.png",
                        iconAnchor: new L.Point(16, 16)
                    })
                }).addTo(appState.map);
                
                // Fetch additional types data
                fetch('/types')
                    .then(resp => resp.json())
                    .then(typesData => {
                        appState.types = typesData;
                    });
            }

            // Set up map layers
            let layersControl = L.control.layers({}, null, {hideSingleBase: true}).addTo(appState.map);
            let firstLayerAdded = false;
            data.layers.forEach(layer => {
                let options = {
                    minZoom: layer.minZoom || 1,
                    maxZoom: layer.maxZoom || 20,
                    subdomains: layer.parts || []
                };

                let tileLayer = L.tileLayer(layer.url, options);
                layersControl.addBaseLayer(tileLayer, layer.name);

                if (!firstLayerAdded) {
                    tileLayer.addTo(appState.map);
                    firstLayerAdded = true;
                }
            });
        })
        .catch(error => console.error('Error loading configuration:', error));
}


function connect() {
    let protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    let url = protocol + window.location.host + '/ws';

    // Assuming `appState` is your global state object
    fetchAllUnits();
    fetchMessages();

    appState.conn = new WebSocket(url);

    appState.conn.onmessage = function(event) {
        processWS(JSON.parse(event.data));
    };

    appState.conn.onopen = function(event) {
        console.log("connected");
        appState.status = "connected";  // Update status in global state
        updateStatusDisplay();  // Assume you have a function to update the UI with the current status
    };

    appState.conn.onerror = function(event) {
        console.error("WebSocket error observed:", event);
        appState.status = "error";
        updateStatusDisplay();
    };

    appState.conn.onclose = function(event) {
        console.log("WebSocket closed");
        appState.status = "";
        updateStatusDisplay();
        setTimeout(connect, 3000);  // Attempt to reconnect
    };
}

function fetchAllUnits() {
    fetch('/unit')
        .then(response => response.json())
        .then(data => processUnits(data))
        .catch(error => console.error('Failed to fetch units:', error));
}

function processUnits(data) {
    // This function would process and update units as needed
    console.log('Processing units:', data);
    // Here you should implement what you want to do with the units data
}

function fetchMessages() {
    fetch('/message')
        .then(response => response.json())
        .then(data => {
            messages = data;  // Assuming 'messages' is a globally or appropriately scoped variable
            console.log('Messages updated:', messages);
        })
        .catch(error => console.error('Failed to fetch messages:', error));
}


function renew() {
    if (!conn) {
        fetchAllUnits();
        fetchMessages();
    }
}


// Make sure to define or import fetchAllUnits and fetchMessages functions as well.


// Assuming getTool and requestOptions are properly defined or imported.

function sender() {
    const dp1Tool = getTool("dp1");
    if (dp1Tool) {
        let p = dp1Tool.getLatLng();

        const requestOptions = {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({lat: p.lat, lon: p.lng, name: "DP1"})
        };
        fetch("/dp", requestOptions);
    }
}

// Mock implementation of getTool to fetch a tool object.
function getTool(name) {
    // Assuming you have a global or accessible map of tools
    return tools.has(name) ? tools.get(name) : null;
}

// Dummy setup, assuming L.marker returns an object with a getLatLng method
tools.set("dp1", {
    getLatLng: () => ({lat: 34.0522, lon: -118.2437})
});

// Assuming you have defined the `Unit` class elsewhere in your script
// and 'appState' is accessible in this context as a global or otherwise imported variable

function processUnits(data) {
    let keys = new Set();

    data.forEach(u => {
        let processedUnit = processUnit(u);
        if (processedUnit) {
            keys.add(processedUnit.uid);
        }
    });

    appState.units.forEach((value, key) => {
        if (!keys.has(key)) {
            removeUnit(key);
        }
    });

    appState.ts += 1;
}

function processUnit(u) {
    if (!u) return;
    let unit = appState.units.get(u.uid);

    if (!unit) {
        unit = new Unit(appState.map, u);
        appState.units.set(u.uid, unit);
    } else {
        unit.update(appState.map, u);
    }

    if (appState.locked_unit_uid === unit.uid) {
        appState.map.setView(unit.coords());
    }

    return unit;
}

function removeUnit(uid) {
    let unit = appState.units.get(uid);
    if (unit) {
        unit.removeMarker(appState.map);
        appState.units.delete(uid);
    }
}

function processWS(u) {
    if (u.type === "unit") {
        processUnit(u.unit);
    } else if (u.type === "delete") {
        removeUnit(u.uid);
    } else if (u.type === "chat") {
        fetchMessages();
    }
}

function removeUnit(uid) {
    if (!appState.units.has(uid)) return;

    let item = appState.units.get(uid);
    if (item && item.marker) {
        item.removeMarker(appState.map); // Assuming `removeMarker` is a method of `item` that handles the marker removal.
    }
    appState.units.delete(uid);

    if (appState.current_unit_uid === uid) {
        setCurrentUnitUid(null, false);
    }
}

// Additional functions that might be called from above
function processUnit(unitData) {
    let unit = appState.units.get(unitData.uid);
    if (!unit) {
        unit = new Unit(appState.map, unitData); // Assuming `Unit` is a constructor you have defined
        appState.units.set(unitData.uid, unit);
    } else {
        unit.update(appState.map, unitData); // Assuming `update` is a method of `Unit`
    }

    if (appState.locked_unit_uid === unit.uid) {
        appState.map.setView(unit.coords()); // Adjust the map view if necessary
    }
}

function setCurrentUnitUid(uid, follow) {
    if (uid && appState.units.has(uid)) {
        appState.current_unit_uid = uid;
        let unit = appState.units.get(uid);
        if (follow) {
            mapToUnit(unit);
        }
        formFromUnit(unit);
    } else {
        appState.current_unit_uid = null;
        formFromUnit(null);
    }
}

function getCurrentUnit() {
    if (!appState.current_unit_uid || !appState.units.has(appState.current_unit_uid)) return null;
    return appState.units.get(appState.current_unit_uid);
}

// Assuming mapToUnit and formFromUnit functions are defined elsewhere in your script

function mapToUnit(unit) {
    if (unit && unit.hasCoords()) {  // Assuming `hasCoords` is a method of `unit`
        appState.map.setView(unit.coords());  // Assuming `coords` is a method that returns [lat, lon]
    }
}

function formFromUnit(unit) {
    if (unit) {
        // Populate form or perform actions with unit data
        console.log("Form populated with unit:", unit);
    } else {
        // Reset or clear form
        console.log("Form reset to default state.");
    }
}

function byCategory(category) {
    let arr = Array.from(appState.units.values()).filter(u => u.unit.category === category);
    arr.sort((a, b) => a.compare(b));
    return appState.ts && arr;  // Assuming ts is some timestamp or change tracking variable
}

function mapToUnit(unit) {
    if (unit && unit.hasCoords()) {
        appState.map.setView(unit.coords());
    }
}

function getImg(item, size) {
    return getIconUri(item, size, false).uri;  // Assuming getIconUri is defined elsewhere
}

function milImg(item) {
    return getMilIconUri(item, 24, false).uri;  // Assuming getMilIconUri is defined elsewhere
}

function dt(str) {
    let d = new Date(Date.parse(str));
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function sp(v) {
    return (v * 3.6).toFixed(1);
}

function modeIs(s) {
    return document.getElementById(s).checked;
}

function mouseMove(e) {
    appState.coords = e.latlng;  // Assuming coords is a property on the appState for tracking mouse movements
}

// Example definitions for undefined functions and state management
function getIconUri(item, size, status) {
    // Placeholder function, implement based on actual logic
    return { uri: `/path/to/icon/${item.type}/${size}/${status ? 'active' : 'inactive'}.png` };
}

function getMilIconUri(item, size, status) {
    // Placeholder function, implement based on actual logic
    return { uri: `/path/to/milicon/${item.type}/${size}/${status ? 'active' : 'inactive'}.png` };
}


// Attach events
document.addEventListener('DOMContentLoaded', () => {
    appState.map.on('mousemove', mouseMove);
});





function mapClick(event) {
    // Handle map click events
}

function mouseMove(event) {
    // Update some UI elements or state when the mouse moves over the map
}

function formFromUnit(unit) {
    // Initialize or reset a form based on a unit's data or lack thereof
}

function getCurrentUnit() {
    if (appState.current_unit_uid) {
        return getCurrentUnitById(appState.current_unit_uid);
    }
    return null;
}

function getCurrentUnitById(uid) {
    // Assuming `appState.units` is a Map or similar structure holding unit data
    return appState.units.get(uid) || null;
}



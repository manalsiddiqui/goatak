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

let appState = {
    messages: [],
    seenMessages: new Set(),
    status: '',
    map: null,
    units: new Map(),
    locked_unit_uid: '',
    ts: 0,
    current_unit_uid: '',
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

function processUnits(data, context) {
    // Create a set to store unique unit IDs
    let keys = new Set();

    // Process each unit in the input data
    for (let unitData of data) {
        let processedUnit = processUnit(unitData, context);
        if (processedUnit) {
            keys.add(processedUnit.uid);
        }
    }

    // Remove units that are no longer in the input data
    for (const existingKey of context.units.keys()) {
        if (!keys.has(existingKey)) {
            context.removeUnit(existingKey);
        }
    }

    // Increment the timestamp or internal counter
    context.ts += 1;
}

function processUnit(unitData, context) {
    if (!unitData) return; // Exit if no data provided

    // Check if the unit already exists
    let unit = context.units.get(unitData.uid);

    if (!unit) {
        // If the unit doesn't exist, create a new one and store it
        unit = new Unit(context.map, unitData);
        context.units.set(unitData.uid, unit);
    } else {
        // If the unit exists, update it
        unit.update(context.map, unitData);
    }

    // If this unit is the one currently locked, adjust the map view
    if (context.locked_unit_uid === unit.uid) {
        context.map.setView(unit.coords());
    }

    return unit; // Return the processed or updated unit
}

function processWS(message, context) {
    // Handle WebSocket message types
    if (message.type === "unit") {
        // Process a single unit update
        processUnit(message.unit, context);
    } else if (message.type === "delete") {
        // Remove a unit by its UID
        context.removeUnit(message.uid);
    } else if (message.type === "chat") {
        // Fetch new chat messages
        context.fetchMessages();
    }
}


//sets up the websocket connection 
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

function initializeMap() {
    map = L.map('map').setView([60, 30], 11);
    L.control.scale({metric: true}).addTo(map);
}

function initializeLayers() {
    layers = L.control.layers({}, null, {hideSingleBase: true}).addTo(map);
    // Dynamically add layers based on some configuration or predefined settings
}
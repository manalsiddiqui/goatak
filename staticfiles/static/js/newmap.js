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
};

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

function getTool(name) {
    if (!appState.tools.has(name)) {
        console.error(`Tool ${name} not found in appState.tools`);
        return null; // or handle the case when the tool is missing
    }
    return appState.tools.get(name);
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

function mapClick(e) {
    if (modeIs("redx")) {
        addOrMove("redx", e.latlng, "/static/icons/x.png");
        return;
    }
    if (modeIs("dp1")) {
        addOrMove("dp1", e.latlng, "/static/icons/spoi_icon.png");
        return;
    }
    if (modeIs("point")) {
        let uid = uuidv4(); // Ensure uuidv4() is defined or included from a library
        let now = new Date();
        let stale = new Date(now);
        stale.setDate(stale.getDate() + 365);
        let u = {
            uid: uid,
            category: "point",
            callsign: "point-" + (++appState.point_num), // Ensure appState.point_num is initialized properly
            sidc: "",
            start_time: now,
            last_seen: now,
            stale_time: stale,
            type: "b-m-p-s-m",
            lat: e.latlng.lat,
            lon: e.latlng.lng,
            hae: 0,
            speed: 0,
            course: 0,
            status: "",
            text: "",
            parent_uid: "",
            parent_callsign: "",
            color: "#ff0000",
            local: true,
            send: false,
        };
        if (appState.config && appState.config.uid) {
            u.parent_uid = appState.config.uid;
            u.parent_callsign = appState.config.callsign;
        }

        let unit = new Unit(null, u); // Ensure Unit class is defined
        unit.send();

        setCurrentUnitUid(u.uid, true);
    }
    if (modeIs("me")) {
        appState.config.lat = e.latlng.lat;
        appState.config.lon = e.latlng.lng;
        appState.me.setLatLng(e.latlng);
        const requestOptions = {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({lat: e.latlng.lat, lon: e.latlng.lng})
        };
        fetch("/pos", requestOptions);
    }
}

function modeIs(mode) {
    return document.getElementById(mode).checked;
}

function addOrMove(name, coord, iconUrl) {
    let tool = appState.tools.get(name);
    if (tool) {
        tool.setLatLng(coord);
    } else {
        tool = L.marker(coord, { icon: L.icon({ iconUrl: iconUrl, iconSize: [20, 20], iconAnchor: [10, 10] }) });
        appState.tools.set(name, tool);
        tool.addTo(appState.map);
    }
}

function setCurrentUnitUid(uid, follow) {
    if (uid && appState.units.has(uid)) {
        appState.current_unit_uid = uid;
        let unit = appState.units.get(uid);
        if (follow) {
            appState.map.setView(unit.coords());
        }
        formFromUnit(unit);
    } else {
        appState.current_unit_uid = null;
        formFromUnit(null);
    }
}

function formFromUnit(u) {
    let formUnit = {};

    if (!u) {
        formUnit = {
            callsign: "",
            category: "",
            type: "",
            subtype: "",
            aff: "",
            text: "",
            send: false,
            root_sidc: null,
        };
    } else {
        formUnit = {
            callsign: u.unit.callsign,
            category: u.unit.category,
            type: u.unit.type,
            subtype: "G",
            aff: "h",
            text: u.unit.text,
            send: u.unit.send,
            root_sidc: appState.types,  // Assuming 'appState.types' stores your types data
        };

        if (u.unit.type.startsWith('a-')) {
            formUnit.type = 'b-m-p-s-m';
            formUnit.aff = u.unit.type.substring(2, 3);
            formUnit.subtype = u.unit.type.substring(4);
            formUnit.root_sidc = getRootSidc(u.unit.type.substring(4));  // Ensure this function is implemented
        }
    }

    // Update the form inputs on the webpage
    updateFormFields(formUnit);
}

function getRootSidc(type) {
    let current = appState.types;  // Starting point for the type lookup
    while (current && current.next) {
        for (let child of current.next) {
            if (type.startsWith(child.code)) {
                return child;
            }
        }
        current = null;  // If no match is found, break out of the loop
    }
    return null;  // Return null if no matching root SIDC is found
}

function updateFormFields(formUnit) {
    document.getElementById('callsign').value = formUnit.callsign;
    document.getElementById('category').value = formUnit.category;
    document.getElementById('type').value = formUnit.type;
    document.getElementById('subtype').value = formUnit.subtype;
    document.getElementById('aff').value = formUnit.aff;
    document.getElementById('text').value = formUnit.text;
    document.getElementById('send').checked = formUnit.send;

    // Optionally update other UI components if they depend on `root_sidc`
    if (formUnit.root_sidc) {
        updateSidcDropdown(formUnit.root_sidc);
    }
}

function updateSidcDropdown(rootSidc) {
    const selectElement = document.getElementById('sidcSelect');
    selectElement.innerHTML = '';  // Clear current options
    if (rootSidc && rootSidc.next) {
        rootSidc.next.forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option.code;
            optElement.text = option.name;
            selectElement.appendChild(optElement);
        });
    }
}

function saveEditForm() {
    let u = getCurrentUnit();
    if (!u) return;

    // Get values directly from the form elements
    u.unit.callsign = document.getElementById('callsign').value;
    u.unit.category = document.getElementById('category').value;
    u.unit.send = document.getElementById('send').checked;
    u.unit.text = document.getElementById('text').value;

    if (u.unit.category === "unit") {
        u.unit.type = ["a", document.getElementById('aff').value, document.getElementById('subtype').value].join('-');
        u.unit.sidc = sidcFromType(u.unit.type);
    } else {
        u.unit.type = document.getElementById('type').value;
        u.unit.sidc = "";
    }

    u.redraw = true;
    u.updateMarker(map); // Ensure `map` is accessible
    u.send();
}

function getRootSidc(s) {
    let current = appState.types; // Assuming `appState.types` stores your types data

    while (current) {
        if (!current.next) {
            return null;
        }

        let found = false;
        for (const k of current.next) {
            if (s.startsWith(k.code)) {
                current = k;
                found = true;
                break;
            }
        }

        if (!found) {
            break; // If no further nesting matches, break the loop
        }
    }

    return current;
}

function getCurrentUnit() {
    // This function should return the currently edited unit by its UID
    // Assume `appState.units` is a Map where unit data is stored
    return appState.units.get(appState.current_unit_uid) || null;
}

function sidcFromType(type) {
    // This function maps a unit type to a standardized SIDC (symbol identification code)
    // Example implementation assuming a simple mapping based on types
    let mappings = {
        'a-h-G': 'SHP', // Sample mapping: unit type 'a-h-G' maps to SIDC 'SHP'
        // Add more mappings as required
    };
    return mappings[type] || '';
}


document.addEventListener('DOMContentLoaded', function() {
    appState.map.on('click', mapClick);
    formFromUnit(null);
    document.getElementById('saveForm').addEventListener('click', saveEditForm);

});


// Attach events
document.addEventListener('DOMContentLoaded', () => {
    appState.map.on('mousemove', mouseMove);
});

function getSidc(s) {
    let current = appState.types; // Assume appState.types holds your types data

    if (s === "") {
        return current;
    }

    while (current) {
        if (!current.next) {
            return null;
        }

        for (const k of current.next) {
            if (k.code === s) {
                return k;
            }
            if (s.startsWith(k.code)) {
                current = k;
                break;
            }
        }
    }
}

function removeTool(name) {
    if (appState.tools.has(name)) {
        let tool = appState.tools.get(name);
        map.removeLayer(tool); // Assuming `map` is the Leaflet map instance
        tool.remove();
        appState.tools.delete(name);
        appState.ts++; // Assuming ts is a timestamp or similar incremental counter
    }
}

// Define the updateStatusDisplay function
function updateStatusDisplay(statusMessage) {
    const statusElement = document.getElementById('statusDisplay');
    if (statusElement) {
        statusElement.textContent = statusMessage;
    } else {
        console.warn("Status display element not found.");
    }
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



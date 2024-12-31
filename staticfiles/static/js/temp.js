// Class definition for Unit which manages unit markers on a map
class Unit {
    constructor(map, u) {
        this.unit = u;
        this.uid = u.uid;
        // Update the marker on the map if the map is provided
        if (map) this.updateMarker(map);
    }

    // Updates the unit data and marker on the map
    update(map, u) {
        if (this.unit.uid !== u.uid) {
            throw "wrong uid"; // Ensure the update is for the correct unit
        }

        this.redraw = this.needsRedraw(u); // Check if redraw is needed

        // Update unit properties
        for (const k of Object.keys(u)) {
            this.unit[k] = u[k];
        }

        this.updateMarker(map); // Update the marker with new data

        return this;
    }

    // Determines if the marker needs to be redrawn
    needsRedraw(u) {
        return this.unit.type !== u.type || 
               this.unit.sidc !== u.sidc || 
               this.unit.status !== u.status ||
               this.unit.speed !== u.speed || 
               this.unit.direction !== u.direction ||
               this.unit.team !== u.team || 
               this.unit.role !== u.role ||
               (this.unit.sidc.charAt(2) === 'A' && this.unit.hae !== u.hae);
    }

    // Check if the unit is a contact type
    isContact() {
        return this.unit.category === "contact"
    }

    // Check if the unit is currently online
    isOnline() {
        return this.unit.status === "Online";
    }

    // Remove the unit marker from the map
    removeMarker(map) {
        if (this.marker) {
            map.removeLayer(this.marker);
            this.marker.remove();
            this.marker = null;
        }
    }

    // Updates or creates a new marker on the map for the unit
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
                    vm.unit.lat = e.target.getLatLng().lat;
                    vm.unit.lon = e.target.getLatLng().lng;
                });
            }

            this.marker.addTo(map);
        }

        this.marker.setLatLng(this.coords());
        this.marker.bindTooltip(this.popup());
        this.redraw = false;
    }

    // Check if the unit has valid coordinates
    hasCoords() {
        return this.unit.lat && this.unit.lon;
    }

    // Returns the coordinates of the unit
    coords() {
        return [this.unit.lat, this.unit.lon];
    }

    // Returns the LatLng object for the unit's location
    latlng() {
        return L.latLng(this.unit.lat, this.unit.lon)
    }

    // Compares this unit's callsign with another unit's callsign
    compare(u2) {
        return this.unit.callsign.toLowerCase().localeCompare(u2.unit.callsign.toLowerCase());
    }

    // Generates the popup content for the unit's marker
    popup() {
        let v = `<b>${this.unit.callsign}</b><br/>`;
        if (this.unit.team) v += `${this.unit.team} ${this.unit.role}<br/>`;
        if (this.unit.speed) v += `Speed: ${this.unit.speed.toFixed(0)} m/s<br/>`;
        if (this.unit.sidc.charAt(2) === 'A') {
            v += `hae: ${this.unit.hae.toFixed(0)} m<br/>`;
        }
        v += this.unit.text.replaceAll('\n', '<br/>').replaceAll('; ', '<br/>');
        return v;
    }

    // Sends updated unit data to the server
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

// Global objects and state
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

// Fetches and updates messages from the server
function fetchMessages() {
    fetch('/message')
        .then(response => response.json())
        .then(data => {
            messages = data;
            updateMessagesUI();
            console.log('Messages updated:', messages);
        })
        .catch(error => {
            console.error('Failed to fetch messages:', error);
            showError('Failed to load messages.');
        });
}

// Updates the UI to display messages
function updateMessagesUI() {
    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.innerHTML = '';
    messages.forEach(msg => {
        const messageElement = document.createElement('div');
        messageElement.textContent = msg.text;
        messagesContainer.appendChild(messageElement);
    });
}

// Displays error messages in the UI
function showError(message) {
    const errorContainer = document.getElementById('error-container');
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
}

// Initializes the map on document load
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    getConfig();
    setupWebSocket();
});

// Initializes and configures the map
function initializeMap() {
    map = L.map('map').setView([60, 30], 11);
    L.control.scale({metric: true}).addTo(map);
}

// Fetches configuration data and applies it
function getConfig() {
    fetch('/config')
        .then(response => response.json())
        .then(data => {
            config = data;
            map.setView([config.lat, config.lon], config.zoom);
            initializeLayers();
        })
        .catch(error => console.error('Error loading configuration:', error));
}

// Initializes and adds layer controls to the map
function initializeLayers() {
    layers = L.control.layers({}, null, {hideSingleBase: true}).addTo(map);
}

// Sets up a WebSocket connection for real-time data
function setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    conn = new WebSocket(protocol + window.location.host + '/ws');
    conn.onmessage = (e) => console.log("WebSocket Data:", JSON.parse(e.data));
    conn.onopen = () => console.log("Connected");
    conn.onerror = () => console.log("WebSocket Error");
    conn.onclose = () => {
        console.log("WebSocket Closed");
        setTimeout(setupWebSocket, 3000);
    };
}

// Handles click events on the map
function mapClick(e) {
    if (modeIs("redx")) {
        addOrMove("redx", e.latlng, "/static/icons/x.png");
    }
}

// Checks if a specific mode is active
function modeIs(mode) {
    return document.getElementById(mode).checked;
}

// Adds or moves a marker
function addOrMove(name, coord, icon) {
    let marker = tools.get(name);
    if (marker) {
        marker.setLatLng(coord);
    } else {
        marker = L.marker(coord, {icon: L.icon({iconUrl: icon, iconSize: [20, 20], iconAnchor: [10, 10]})}).addTo(map);
        tools.set(name, marker);
    }
}

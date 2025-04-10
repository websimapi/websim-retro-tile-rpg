// --- Imports & Setup ---
// WebsimSocket is globally available

const TILE_WIDTH = 64;
const TILE_HEIGHT = 32; // For isometric projection (width / 2)
const GRID_SIZE_X = 20; // Number of tiles horizontally
const GRID_SIZE_Y = 20; // Number of tiles vertically

const svg = document.getElementById('game-svg');
const gameContainer = document.getElementById('game-container');
const devInfo = document.getElementById('dev-info');
let clickMarkerGroup; // Group to hold click markers
let customCursor; // Element for custom cursor

const room = new WebsimSocket();

// --- Game State ---
let players = {}; // Local cache of player elements/data

// --- World Data (Client-Side for now) ---
// Simple procedural world
const worldTiles = {};
for (let x = 0; x < GRID_SIZE_X; x++) {
    for (let y = 0; y < GRID_SIZE_Y; y++) {
        const key = `${x},${y}`;
        // Simple noise for variety
        const noise = Math.random();
        if (noise < 0.1) {
            worldTiles[key] = 'water';
        } else if (noise < 0.2) {
             worldTiles[key] = 'stone';
        } else {
            worldTiles[key] = 'grass';
        }
    }
}

// --- Rendering Functions ---

// Convert tile coordinates to screen pixel coordinates (isometric)
function tileToScreen(x, y) {
    const screenX = (x - y) * (TILE_WIDTH / 2);
    const screenY = (x + y) * (TILE_HEIGHT / 2);
    return { x: screenX, y: screenY };
}

// Convert screen pixel coordinates to tile coordinates (improved)
function screenToTile(screenX, screenY, worldTransform) {
    // Adjust for world transform
    const adjustedX = screenX - worldTransform.e;
    const adjustedY = screenY - worldTransform.f;
    
    // Inverse isometric projection
    const tileX = Math.floor((adjustedX / (TILE_WIDTH / 2) + adjustedY / (TILE_HEIGHT / 2)) / 2);
    const tileY = Math.floor((adjustedY / (TILE_HEIGHT / 2) - adjustedX / (TILE_WIDTH / 2)) / 2);
    
    return { x: tileX, y: tileY };
}

function drawWorld() {
    const tilesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    tilesGroup.id = 'tiles-group';

    // Center the view roughly
    const viewCenterX = svg.getAttribute('width') / 2;
    const viewCenterY = svg.getAttribute('height') / 2 - TILE_HEIGHT * 5; // Offset up slightly

    for (let x = 0; x < GRID_SIZE_X; x++) {
        for (let y = 0; y < GRID_SIZE_Y; y++) {
            const tileKey = `${x},${y}`;
            const tileType = worldTiles[tileKey] || 'grass';
            const pos = tileToScreen(x, y);

            const tile = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            const points = [
                { x: pos.x, y: pos.y + TILE_HEIGHT / 2 },                     // Top point
                { x: pos.x + TILE_WIDTH / 2, y: pos.y + TILE_HEIGHT },       // Right point
                { x: pos.x, y: pos.y + TILE_HEIGHT * 1.5 },                   // Bottom point
                { x: pos.x - TILE_WIDTH / 2, y: pos.y + TILE_HEIGHT }        // Left point
            ].map(p => `${p.x},${p.y}`).join(' ');

            tile.setAttribute('points', points);
            tile.setAttribute('class', `tile tile-${tileType}`);
            tile.dataset.x = x;
            tile.dataset.y = y;
            tilesGroup.appendChild(tile);
        }
    }
    // Apply centering transform
    tilesGroup.setAttribute('transform', `translate(${viewCenterX}, ${viewCenterY})`);

    // Ensure tiles are added before players
    const playersGroup = svg.getElementById('players-group');
    if (playersGroup) {
        svg.insertBefore(tilesGroup, playersGroup);
    } else {
        svg.appendChild(tilesGroup);
    }

    // Add click listener to the SVG for movement
    svg.addEventListener('click', handleMapClick);

    // Create a group for click markers, drawn above tiles but below players
    clickMarkerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    clickMarkerGroup.id = 'click-markers-group';
    if (playersGroup) {
         svg.insertBefore(clickMarkerGroup, playersGroup);
    } else {
         svg.appendChild(clickMarkerGroup);
    }
    
    // Create and initialize custom cursor
    initializeCustomCursor();
}

// Create custom cursor
function initializeCustomCursor() {
    // Create cursor group
    customCursor = document.createElementNS("http://www.w3.org/2000/svg", "g");
    customCursor.id = 'custom-cursor';
    
    // Create cursor circle
    const cursorCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    cursorCircle.setAttribute('cx', 0);
    cursorCircle.setAttribute('cy', 0);
    cursorCircle.setAttribute('r', 5);
    cursorCircle.setAttribute('class', 'cursor-circle');
    
    // Create cursor crosshair
    const crosshairH = document.createElementNS("http://www.w3.org/2000/svg", "line");
    crosshairH.setAttribute('x1', -7);
    crosshairH.setAttribute('y1', 0);
    crosshairH.setAttribute('x2', 7);
    crosshairH.setAttribute('y2', 0);
    crosshairH.setAttribute('class', 'cursor-line');
    
    const crosshairV = document.createElementNS("http://www.w3.org/2000/svg", "line");
    crosshairV.setAttribute('x1', 0);
    crosshairV.setAttribute('y1', -7);
    crosshairV.setAttribute('x2', 0);
    crosshairV.setAttribute('y2', 7);
    crosshairV.setAttribute('class', 'cursor-line');
    
    // Add cursor elements to group
    customCursor.appendChild(cursorCircle);
    customCursor.appendChild(crosshairH);
    customCursor.appendChild(crosshairV);
    
    // Add cursor to SVG
    svg.appendChild(customCursor);
    
    // Mouse move event listener for cursor
    svg.addEventListener('mousemove', updateCustomCursorPosition);
    
    // Add events for cursor visibility
    gameContainer.addEventListener('mouseenter', () => {
        customCursor.classList.add('active');
    });
    
    gameContainer.addEventListener('mouseleave', () => {
        customCursor.classList.remove('active');
    });
}

// Update custom cursor position
function updateCustomCursorPosition(event) {
    const svgRect = svg.getBoundingClientRect();
    const mouseX = event.clientX - svgRect.left;
    const mouseY = event.clientY - svgRect.top;
    
    // Update cursor position
    customCursor.setAttribute('transform', `translate(${mouseX}, ${mouseY})`);
    
    // Update tile highlight info in dev panel
    if (customCursor.classList.contains('active')) {
        const tilesGroup = svg.getElementById('tiles-group');
        const worldTransform = tilesGroup ? tilesGroup.transform.baseVal.consolidate().matrix : { e: 0, f: 0 };
        const tileUnderCursor = screenToTile(mouseX, mouseY, worldTransform);
        
        // Clamp to grid bounds
        const cursorTileX = Math.max(0, Math.min(GRID_SIZE_X - 1, tileUnderCursor.x));
        const cursorTileY = Math.max(0, Math.min(GRID_SIZE_Y - 1, tileUnderCursor.y));
        
        const tileKey = `${cursorTileX},${cursorTileY}`;
        const tileType = worldTiles[tileKey] || 'unknown';
        
        // Update dev info with cursor position
        updateDevInfo(cursorTileX, cursorTileY, tileType);
    }
}

function drawPlayer(clientId, presenceData, peerData) {
    const { x = 0, y = 0 } = presenceData || {}; // Default to 0,0 if no position
    const { username = 'Player', avatarUrl } = peerData || {}; // Use peer data

    let playerGroup = svg.getElementById(`player-${clientId}`);
    let playerBody, playerHead, playerNameTag;

    if (!playerGroup) {
        playerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        playerGroup.id = `player-${clientId}`;
        playerGroup.classList.add('player');

        // Simple player representation
        playerBody = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        playerBody.setAttribute('class', 'player-body');
        playerBody.setAttribute('x', -8);
        playerBody.setAttribute('y', -25); // Position relative to the center bottom
        playerBody.setAttribute('width', 16);
        playerBody.setAttribute('height', 20);
        playerGroup.appendChild(playerBody);

        playerHead = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        playerHead.setAttribute('class', 'player-head');
        playerHead.setAttribute('cx', 0);
        playerHead.setAttribute('cy', -32); // Above the body
        playerHead.setAttribute('r', 7);
        playerGroup.appendChild(playerHead);

        // Add username display
        playerNameTag = document.createElementNS("http://www.w3.org/2000/svg", "text");
        playerNameTag.setAttribute('class', 'player-name');
        playerNameTag.setAttribute('x', 0);
        playerNameTag.setAttribute('y', -45); // Above the head
        playerNameTag.textContent = username;
        playerGroup.appendChild(playerNameTag);


        // Ensure players group exists
        let playersGroup = svg.getElementById('players-group');
        if (!playersGroup) {
            playersGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            playersGroup.id = 'players-group';
            svg.appendChild(playersGroup);
        }
        playersGroup.appendChild(playerGroup);

        players[clientId] = { element: playerGroup, body: playerBody, head: playerHead, nameTag: playerNameTag };
    } else {
         if (players[clientId] && players[clientId].nameTag.textContent !== username) {
             players[clientId].nameTag.textContent = username;
         }
    }

    // Calculate screen position based on tile coordinates
    const screenPos = tileToScreen(x, y);

    // Adjust for player height (center bottom of sprite on tile center)
    const drawX = screenPos.x;
    const drawY = screenPos.y + TILE_HEIGHT; // Base of the player at the tile's center y

     // Get world transform offset
    const tilesGroup = svg.getElementById('tiles-group');
    const worldTransform = tilesGroup ? tilesGroup.transform.baseVal.consolidate().matrix : { e: 0, f: 0 };


    // Apply transform to move the player group
    playerGroup.setAttribute('transform', `translate(${worldTransform.e + drawX}, ${worldTransform.f + drawY})`);

    // Simple Z-ordering based on Y-coordinate (further back tiles drawn first)
    // This works because SVG renders elements later in the DOM on top.
    // We re-append the element to ensure it's ordered correctly relative to others on the same Y.
    // A more robust solution would sort all players in the group.
    const playersGroup = svg.getElementById('players-group');
    if (playersGroup) { // Ensure group exists
        // Crude sorting: players further down (higher Y tile) are drawn later (on top)
        const sortedPlayers = Array.from(playersGroup.children).sort((a, b) => {
            const presenceA = room.presence[a.id.replace('player-', '')] || { y: 0 };
            const presenceB = room.presence[b.id.replace('player-', '')] || { y: 0 };
            return (presenceA.x + presenceA.y) - (presenceB.x + presenceB.y); // Sort by combined coords for iso depth
        });
        sortedPlayers.forEach(p => playersGroup.appendChild(p)); // Re-append in sorted order
    }
}

function removePlayer(clientId) {
    const playerElement = svg.getElementById(`player-${clientId}`);
    if (playerElement) {
        playerElement.remove();
    }
    delete players[clientId];
}

function updateDevInfo(cursorTileX, cursorTileY, tileType) {
    const player = room.presence[room.clientId] || {};
    const pos = `Pos: (${player.x ?? 'N/A'}, ${player.y ?? 'N/A'})`;
    const peersCount = Object.keys(room.peers).length;
    let devText = `User: ${room.peers[room.clientId]?.username || 'Connecting...'} | ${pos} | Peers: ${peersCount}`;
    
    // Add cursor position if provided
    if (cursorTileX !== undefined && cursorTileY !== undefined) {
        devText += ` | Cursor: (${cursorTileX}, ${cursorTileY}) [${tileType}]`;
    }
    
    devInfo.textContent = devText;
}

// --- Click Marker ---
function createClickMarker(screenX, screenY) {
    const markerSize = 10; // Size of the X marker lines
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "g");
    marker.setAttribute('class', 'click-marker');
    marker.setAttribute('transform', `translate(${screenX}, ${screenY})`); // Position at click point

    // Create the two lines for the X
    const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line1.setAttribute('x1', -markerSize / 2);
    line1.setAttribute('y1', -markerSize / 2);
    line1.setAttribute('x2', markerSize / 2);
    line1.setAttribute('y2', markerSize / 2);

    const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line2.setAttribute('x1', -markerSize / 2);
    line2.setAttribute('y1', markerSize / 2);
    line2.setAttribute('x2', markerSize / 2);
    line2.setAttribute('y2', -markerSize / 2);

    marker.appendChild(line1);
    marker.appendChild(line2);

    // Append to the dedicated marker group
    if (clickMarkerGroup) {
        clickMarkerGroup.appendChild(marker);
    } else {
        svg.appendChild(marker); // Fallback if group isn't ready
    }


    // Remove the marker after the animation finishes (600ms)
    marker.addEventListener('animationend', () => {
        marker.remove();
    });
    // Fallback removal in case animationend doesn't fire reliably
    setTimeout(() => {
         if (marker.parentNode) {
             marker.remove();
         }
    }, 600);
}

// --- Event Handlers ---

function handleMapClick(event) {
    const svgRect = svg.getBoundingClientRect();
    const clickX = event.clientX - svgRect.left;
    const clickY = event.clientY - svgRect.top;

    // Get world transform
    const tilesGroup = svg.getElementById('tiles-group');
    const worldTransform = tilesGroup ? tilesGroup.transform.baseVal.consolidate().matrix : { e: 0, f: 0 };

    // Convert screen position to tile position with improved function
    const targetTile = screenToTile(clickX, clickY, worldTransform);

    // Clamp coordinates to grid bounds
    const targetX = Math.max(0, Math.min(GRID_SIZE_X - 1, targetTile.x));
    const targetY = Math.max(0, Math.min(GRID_SIZE_Y - 1, targetTile.y));

    console.log(`Clicked screen: (${clickX}, ${clickY}), Target Tile: (${targetX}, ${targetY})`);

    // Basic validation: don't move into water for now
    const targetTileKey = `${targetX},${targetY}`;
    if (worldTiles[targetTileKey] === 'water') {
        console.log("Cannot move into water.");
        return;
    }

    // Calculate the screen center of the target tile for the marker
    const targetScreenPos = tileToScreen(targetX, targetY);
    
    // Adjust position using the world transform
    const markerScreenX = worldTransform.e + targetScreenPos.x;
    const markerScreenY = worldTransform.f + targetScreenPos.y + TILE_HEIGHT; // Center on the tile visually

    createClickMarker(markerScreenX, markerScreenY);

    // Update presence
    room.updatePresence({ x: targetX, y: targetY });
}

// --- Websim Integration ---

async function initializeGame() {
    try {
        await room.initialize();
        console.log('Websim initialized:', room.clientId);
        console.log('Peers:', room.peers);
        console.log('Initial Presence:', room.presence);
        console.log('Initial Room State:', room.roomState);

        // Initial setup
        drawWorld(); // Draw the base map

        // Set initial state if not present (e.g., starting position)
        if (!room.presence[room.clientId]?.hasOwnProperty('x')) {
             const startX = Math.floor(GRID_SIZE_X / 2);
             const startY = Math.floor(GRID_SIZE_Y / 2);
             // Ensure starting tile isn't water
             let sx = startX, sy = startY;
             while (worldTiles[`${sx},${sy}`] === 'water') {
                 sx = Math.floor(Math.random() * GRID_SIZE_X);
                 sy = Math.floor(Math.random() * GRID_SIZE_Y);
             }
             room.updatePresence({ x: sx, y: sy });
        }


        // Draw initial players
        for (const clientId in room.presence) {
            if (room.peers[clientId]) { // Only draw if peer data is available
                 drawPlayer(clientId, room.presence[clientId], room.peers[clientId]);
            }
        }

        updateDevInfo();


        // Subscribe to presence updates
        room.subscribePresence((updatedPresence) => {
             // console.log('Presence updated:', updatedPresence);
            // Update or remove players based on changes
            const currentClientIds = new Set(Object.keys(players));
            const incomingClientIds = new Set(Object.keys(room.presence)); // Use room.presence as source of truth

            // Add or update players
            for (const clientId in room.presence) {
                 if (room.peers[clientId]) { // Check if peer exists (they might disconnect)
                    drawPlayer(clientId, room.presence[clientId], room.peers[clientId]);
                    currentClientIds.delete(clientId); // Mark as handled
                 } else {
                     // Peer data not yet available or peer disconnected before presence update processed fully
                     removePlayer(clientId); // Clean up if peer is gone
                     currentClientIds.delete(clientId);
                 }
            }

            // Remove players who are no longer present or lack peer data
            currentClientIds.forEach(removePlayer);
            updateDevInfo();
        });

        // Subscribe to room state updates (if needed later)
        room.subscribeRoomState((updatedRoomState) => {
            console.log('Room state updated:', updatedRoomState);
            // Handle changes to world objects, etc.
        });

        // Handle incoming messages/events (if needed later)
        room.onmessage = (event) => {
            console.log("Received message:", event);
            const data = event.data;
            switch (data.type) {
                case "connected":
                    console.log(`Client connected: ${data.clientId}, ${data.username}`);
                    // Presence update will handle drawing the new player
                    updateDevInfo();
                    break;
                case "disconnected":
                    console.log(`Client disconnected: ${data.clientId}, ${data.username}`);
                    removePlayer(data.clientId); // Ensure removal on disconnect message
                    updateDevInfo();
                    break;
                // Handle custom game events here
                default:
                    console.log("Received event:", data);
            }
        };

        // Handle presence update requests (if needed later, e.g., for combat)
        room.subscribePresenceUpdateRequests((updateRequest, fromClientId) => {
             console.log(`Received presence update request from ${fromClientId}:`, updateRequest);
             // Handle requests like 'damage', 'trade', etc.
        });


    } catch (error) {
        console.error("Failed to initialize Websim:", error);
        devInfo.textContent = "Error connecting.";
    }
}

// --- Start Game ---
initializeGame();
import { TilePathfinder, MovementManager } from './pathfinding.js';
import { CharacterAnimator } from './animations.js';
import { UIManager } from './ui.js';

export class Game {
    constructor(svg, gameContainer, devInfo) {
        this.svg = svg;
        this.gameContainer = gameContainer;
        this.devInfo = devInfo;
        this.room = new WebsimSocket();
        this.players = {};
        this.TILE_WIDTH = 64;
        this.TILE_HEIGHT = 32;
        this.GRID_SIZE_X = 20;
        this.GRID_SIZE_Y = 20;
        this.ui = new UIManager(svg);
        this.worldTiles = {};
        for (let x = 0; x < this.GRID_SIZE_X; x++) {
            for (let y = 0; y < this.GRID_SIZE_Y; y++) {
                const key = `${x},${y}`;
                const noise = Math.random();
                if (noise < 0.1) {
                    this.worldTiles[key] = 'water';
                } else if (noise < 0.2) {
                    this.worldTiles[key] = 'stone';
                } else {
                    this.worldTiles[key] = 'grass';
                }
            }
        }
        this.pathfinder = new TilePathfinder(this.worldTiles, this.GRID_SIZE_X, this.GRID_SIZE_Y);
        this.movementManager = new MovementManager(this.room);
        
        // Bind methods
        this.handleMapClick = this.handleMapClick.bind(this);
        this.updateCustomCursorPosition = this.updateCustomCursorPosition.bind(this);
    }

    handleMapClick(event) {
        const svgRect = this.svg.getBoundingClientRect();
        const clickX = event.clientX - svgRect.left;
        const clickY = event.clientY - svgRect.top;

        const tilesGroup = this.svg.getElementById('tiles-group');
        const worldTransform = tilesGroup ? tilesGroup.transform.baseVal.consolidate().matrix : { e: 0, f: 0 };

        const targetTile = this.screenToTile(clickX - worldTransform.e, clickY - worldTransform.f);
        const targetX = Math.max(0, Math.min(this.GRID_SIZE_X - 1, targetTile.x));
        const targetY = Math.max(0, Math.min(this.GRID_SIZE_Y - 1, targetTile.y));

        const currentPos = this.room.presence[this.room.clientId] || { x: 0, y: 0 };
        
        const path = this.pathfinder.findPath(
            currentPos.x, 
            currentPos.y,
            targetX,
            targetY
        );

        if (path) {
            const targetScreenPos = this.tileToScreen(targetX, targetY);
            this.ui.showClickMarker(
                worldTransform.e + targetScreenPos.x,
                worldTransform.f + targetScreenPos.y + this.TILE_HEIGHT/2
            );
            this.movementManager.startMoving(path);
        }
    }

    tileToScreen(x, y) {
        const screenX = (x - y) * (this.TILE_WIDTH / 2);
        const screenY = (x + y) * (this.TILE_HEIGHT / 2);
        return { x: screenX, y: screenY };
    }

    screenToTile(screenX, screenY, worldTransform) {
        // Adjust for world transform
        const adjustedX = screenX - worldTransform.e;
        const adjustedY = screenY - worldTransform.f;
        
        // Inverse isometric projection
        const tileX = Math.floor((adjustedX / (this.TILE_WIDTH / 2) + adjustedY / (this.TILE_HEIGHT / 2)) / 2);
        const tileY = Math.floor((adjustedY / (this.TILE_HEIGHT / 2) - adjustedX / (this.TILE_WIDTH / 2)) / 2);
        
        return { x: tileX, y: tileY };
    }

    drawWorld() {
        const tilesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        tilesGroup.id = 'tiles-group';

        // Center the view roughly
        const viewCenterX = this.svg.getAttribute('width') / 2;
        const viewCenterY = this.svg.getAttribute('height') / 2 - this.TILE_HEIGHT * 5; // Offset up slightly

        for (let x = 0; x < this.GRID_SIZE_X; x++) {
            for (let y = 0; y < this.GRID_SIZE_Y; y++) {
                const tileKey = `${x},${y}`;
                const tileType = this.worldTiles[tileKey] || 'grass';
                const pos = this.tileToScreen(x, y);

                const tile = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                const points = [
                    { x: pos.x, y: pos.y + this.TILE_HEIGHT / 2 },                     // Top point
                    { x: pos.x + this.TILE_WIDTH / 2, y: pos.y + this.TILE_HEIGHT },       // Right point
                    { x: pos.x, y: pos.y + this.TILE_HEIGHT * 1.5 },                   // Bottom point
                    { x: pos.x - this.TILE_WIDTH / 2, y: pos.y + this.TILE_HEIGHT }        // Left point
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
        const playersGroup = this.svg.getElementById('players-group');
        if (playersGroup) {
            this.svg.insertBefore(tilesGroup, playersGroup);
        } else {
            this.svg.appendChild(tilesGroup);
        }

        // Add click listener to the SVG for movement
        this.svg.addEventListener('click', this.handleMapClick);

        // Add mouse move event listener for cursor
        this.svg.addEventListener('mousemove', this.updateCustomCursorPosition);
    }

    updateCustomCursorPosition(event) {
        const svgRect = this.svg.getBoundingClientRect();
        const mouseX = event.clientX - svgRect.left;
        const mouseY = event.clientY - svgRect.top;
        
        this.ui.updateCursorPosition(mouseX, mouseY);
        
        // Update tile highlight info in dev panel
        if (this.ui.isCursorVisible()) {
            const tilesGroup = this.svg.getElementById('tiles-group');
            const worldTransform = tilesGroup ? tilesGroup.transform.baseVal.consolidate().matrix : { e: 0, f: 0 };
            const tileUnderCursor = this.screenToTile(mouseX - worldTransform.e, mouseY - worldTransform.f);
            
            // Clamp to grid bounds
            const cursorTileX = Math.max(0, Math.min(this.GRID_SIZE_X - 1, tileUnderCursor.x));
            const cursorTileY = Math.max(0, Math.min(this.GRID_SIZE_Y - 1, tileUnderCursor.y));
            
            const tileKey = `${cursorTileX},${cursorTileY}`;
            const tileType = this.worldTiles[tileKey] || 'unknown';
            
            // Update dev info with cursor position
            this.updateDevInfo(cursorTileX, cursorTileY, tileType);
        }
    }

    drawPlayer(clientId, presenceData, peerData) {
        const { x = 0, y = 0 } = presenceData || {}; // Default to 0,0 if no position
        const { username = 'Player', avatarUrl } = peerData || {}; // Use peer data

        let playerGroup = this.svg.getElementById(`player-${clientId}`);
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
            let playersGroup = this.svg.getElementById('players-group');
            if (!playersGroup) {
                playersGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                playersGroup.id = 'players-group';
                this.svg.appendChild(playersGroup);
            }
            playersGroup.appendChild(playerGroup);

            this.players[clientId] = { element: playerGroup, body: playerBody, head: playerHead, nameTag: playerNameTag };
        } else {
             if (this.players[clientId] && this.players[clientId].nameTag.textContent !== username) {
                 this.players[clientId].nameTag.textContent = username;
             }
        }

        // Calculate screen position based on tile coordinates
        const screenPos = this.tileToScreen(x, y);

        // Adjust for player height (center bottom of sprite on tile center)
        const drawX = screenPos.x;
        const drawY = screenPos.y + this.TILE_HEIGHT; // Base of the player at the tile's center y

         // Get world transform offset
        const tilesGroup = this.svg.getElementById('tiles-group');
        const worldTransform = tilesGroup ? tilesGroup.transform.baseVal.consolidate().matrix : { e: 0, f: 0 };

        // Apply transform to move the player group
        playerGroup.setAttribute('transform', `translate(${worldTransform.e + drawX}, ${worldTransform.f + drawY})`);

        if (!this.players[clientId].animator) {
            this.players[clientId].animator = new CharacterAnimator(playerGroup);
        }

        // Simple Z-ordering based on Y-coordinate (further back tiles drawn first)
        // This works because SVG renders elements later in the DOM on top.
        // We re-append the element to ensure it's ordered correctly relative to others on the same Y.
        // A more robust solution would sort all players in the group.
        const playersGroup = this.svg.getElementById('players-group');
        if (playersGroup) { // Ensure group exists
            // Crude sorting: players further down (higher Y tile) are drawn later (on top)
            const sortedPlayers = Array.from(playersGroup.children).sort((a, b) => {
                const presenceA = this.room.presence[a.id.replace('player-', '')] || { y: 0 };
                const presenceB = this.room.presence[b.id.replace('player-', '')] || { y: 0 };
                return (presenceA.x + presenceA.y) - (presenceB.x + presenceB.y); // Sort by combined coords for iso depth
            });
            sortedPlayers.forEach(p => playersGroup.appendChild(p)); // Re-append in sorted order
        }
    }

    removePlayer(clientId) {
        const playerElement = this.svg.getElementById(`player-${clientId}`);
        if (playerElement) {
            playerElement.remove();
        }
        delete this.players[clientId];
    }

    updateDevInfo(cursorTileX, cursorTileY, tileType) {
        const player = this.room.presence[this.room.clientId] || {};
        const pos = `Pos: (${player.x ?? 'N/A'}, ${player.y ?? 'N/A'})`;
        const peersCount = Object.keys(this.room.peers).length;
        let devText = `User: ${this.room.peers[this.room.clientId]?.username || 'Connecting...'} | ${pos} | Peers: ${peersCount}`;
        
        // Add cursor position if provided
        if (cursorTileX !== undefined && cursorTileY !== undefined) {
            devText += ` | Cursor: (${cursorTileX}, ${cursorTileY}) [${tileType}]`;
        }
        
        this.devInfo.textContent = devText;
    }

    initializeGame() {
        try {
            this.room.initialize();
            console.log('Websim initialized:', this.room.clientId);
            console.log('Peers:', this.room.peers);
            console.log('Initial Presence:', this.room.presence);
            console.log('Initial Room State:', this.room.roomState);

            if (this.players[this.room.clientId]) {
                this.movementManager.setAnimator(this.players[this.room.clientId].animator);
            }

            // Initial setup
            this.drawWorld(); // Draw the base map

            // Set initial state if not present (e.g., starting position)
            if (!this.room.presence[this.room.clientId]?.hasOwnProperty('x')) {
                 const startX = Math.floor(this.GRID_SIZE_X / 2);
                 const startY = Math.floor(this.GRID_SIZE_Y / 2);
                 // Ensure starting tile isn't water
                 let sx = startX, sy = startY;
                 while (this.worldTiles[`${sx},${sy}`] === 'water') {
                     sx = Math.floor(Math.random() * this.GRID_SIZE_X);
                     sy = Math.floor(Math.random() * this.GRID_SIZE_Y);
                 }
                 this.room.updatePresence({ x: sx, y: sy });
            }


            // Draw initial players
            for (const clientId in this.room.presence) {
                if (this.room.peers[clientId]) { // Only draw if peer data is available
                     this.drawPlayer(clientId, this.room.presence[clientId], this.room.peers[clientId]);
                }
            }

            this.updateDevInfo();

            this.gameContainer.addEventListener('mouseenter', () => {
                this.ui.setCursorVisibility(true);
            });
            
            this.gameContainer.addEventListener('mouseleave', () => {
                this.ui.setCursorVisibility(false);
            });

            // Subscribe to presence updates
            this.room.subscribePresence((updatedPresence) => {
                 // console.log('Presence updated:', updatedPresence);
                // Update or remove players based on changes
                const currentClientIds = new Set(Object.keys(this.players));
                const incomingClientIds = new Set(Object.keys(this.room.presence)); // Use room.presence as source of truth

                // Add or update players
                for (const clientId in this.room.presence) {
                     if (this.room.peers[clientId]) { // Check if peer exists (they might disconnect)
                        this.drawPlayer(clientId, this.room.presence[clientId], this.room.peers[clientId]);
                        currentClientIds.delete(clientId); // Mark as handled
                     } else {
                         // Peer data not yet available or peer disconnected before presence update processed fully
                         this.removePlayer(clientId); // Clean up if peer is gone
                         currentClientIds.delete(clientId);
                     }
                }

                // Remove players who are no longer present or lack peer data
                currentClientIds.forEach(this.removePlayer.bind(this));
                this.updateDevInfo();
            });

            // Subscribe to room state updates (if needed later)
            this.room.subscribeRoomState((updatedRoomState) => {
                console.log('Room state updated:', updatedRoomState);
                // Handle changes to world objects, etc.
            });

            // Handle incoming messages/events (if needed later)
            this.room.onmessage = (event) => {
                console.log("Received message:", event);
                const data = event.data;
                switch (data.type) {
                    case "connected":
                        console.log(`Client connected: ${data.clientId}, ${data.username}`);
                        // Presence update will handle drawing the new player
                        this.updateDevInfo();
                        break;
                    case "disconnected":
                        console.log(`Client disconnected: ${data.clientId}, ${data.username}`);
                        this.removePlayer(data.clientId); // Ensure removal on disconnect message
                        this.updateDevInfo();
                        break;
                    // Handle custom game events here
                    default:
                        console.log("Received event:", data);
                }
            };

            // Handle presence update requests (if needed later, e.g., for combat)
            this.room.subscribePresenceUpdateRequests((updateRequest, fromClientId) => {
                 console.log(`Received presence update request from ${fromClientId}:`, updateRequest);
                 // Handle requests like 'damage', 'trade', etc.
            });


        } catch (error) {
            console.error("Failed to initialize Websim:", error);
            this.devInfo.textContent = "Error connecting.";
        }
    }
}
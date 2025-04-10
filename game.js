import { TilePathfinder, MovementManager } from './pathfinding.js';
import { CharacterAnimator } from './animations.js';
import { Camera } from './camera.js';
import { CameraControls } from './cameraControls.js';
import { World } from './world.js';

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
        this.customCursor = null;

        // Create world manager
        this.world = new World(svg, this.TILE_WIDTH, this.TILE_HEIGHT, this.GRID_SIZE_X, this.GRID_SIZE_Y);

        // Bind methods
        this.handleMapClick = this.handleMapClick.bind(this);
        this.updateCustomCursorPosition = this.updateCustomCursorPosition.bind(this);
    }

    handleMapClick(event) {
        const svgRect = this.svg.getBoundingClientRect();
        const clickX = event.clientX - svgRect.left;
        const clickY = event.clientY - svgRect.top;

        // Convert screen to tile coordinates using camera
        const targetTile = this.camera.screenToTile(clickX, clickY);
        const targetX = Math.max(0, Math.min(this.GRID_SIZE_X - 1, targetTile.x));
        const targetY = Math.max(0, Math.min(this.GRID_SIZE_Y - 1, targetTile.y));

        const currentPos = this.room.presence[this.room.clientId] || { x: 0, y: 0 };

        // Find path to target
        const path = this.pathfinder.findPath(
            currentPos.x,
            currentPos.y,
            targetX,
            targetY
        );

        if (path && path.length > 0) {
            // Get target position in screen space for click marker
            const targetScreenPos = this.camera.tileToScreen(targetX, targetY);

            // Create click marker at target position (adjust Y to place at base of tile)
            this.world.createClickMarker(targetScreenPos.x, targetScreenPos.y + this.TILE_HEIGHT);

            // Start movement along path
            this.movementManager.startMoving(path);
        }
    }

    initializeCustomCursor() {
        this.customCursor = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.customCursor.id = 'custom-cursor';

        const cursorCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        cursorCircle.setAttribute('cx', 0);
        cursorCircle.setAttribute('cy', 0);
        cursorCircle.setAttribute('r', 5);
        cursorCircle.setAttribute('class', 'cursor-circle');

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

        this.customCursor.appendChild(cursorCircle);
        this.customCursor.appendChild(crosshairH);
        this.customCursor.appendChild(crosshairV);

        this.svg.appendChild(this.customCursor);

        this.svg.addEventListener('mousemove', this.updateCustomCursorPosition);

        this.gameContainer.addEventListener('mouseenter', () => {
            this.customCursor.classList.add('active');
        });

        this.gameContainer.addEventListener('mouseleave', () => {
            this.customCursor.classList.remove('active');
        });
    }

    updateCustomCursorPosition(event) {
        const svgRect = this.svg.getBoundingClientRect();
        const mouseX = event.clientX - svgRect.left;
        const mouseY = event.clientY - svgRect.top;

        this.customCursor.setAttribute('transform', `translate(${mouseX}, ${mouseY})');

        if (this.customCursor.classList.contains('active') && this.camera) {
            const tileUnderCursor = this.camera.screenToTile(mouseX, mouseY);

            const cursorTileX = Math.max(0, Math.min(this.GRID_SIZE_X - 1, tileUnderCursor.x));
            const cursorTileY = Math.max(0, Math.min(this.GRID_SIZE_Y - 1, tileUnderCursor.y));

            const tileType = this.world.getTileType(cursorTileX, cursorTileY);

            this.updateDevInfo(cursorTileX, cursorTileY, tileType);
        }
    }

    drawPlayer(clientId, presenceData, peerData) {
        const { x = 0, y = 0 } = presenceData || {};
        const { username = 'Player' } = peerData || {};

        let playerGroup = this.svg.getElementById(`player-${clientId}`);
        let playerBody, playerHead, playerNameTag;

        if (!playerGroup) {
            playerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            playerGroup.id = `player-${clientId}`;
            playerGroup.classList.add('player');

            playerBody = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            playerBody.setAttribute('class', 'player-body');
            playerBody.setAttribute('x', -8);
            playerBody.setAttribute('y', -25);
            playerBody.setAttribute('width', 16);
            playerBody.setAttribute('height', 20);
            playerGroup.appendChild(playerBody);

            playerHead = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            playerHead.setAttribute('class', 'player-head');
            playerHead.setAttribute('cx', 0);
            playerHead.setAttribute('cy', -32);
            playerHead.setAttribute('r', 7);
            playerGroup.appendChild(playerHead);

            playerNameTag = document.createElementNS("http://www.w3.org/2000/svg", "text");
            playerNameTag.setAttribute('class', 'player-name');
            playerNameTag.setAttribute('x', 0);
            playerNameTag.setAttribute('y', -45);
            playerNameTag.textContent = username;
            playerGroup.appendChild(playerNameTag);

            this.world.playersGroup.appendChild(playerGroup);
            this.players[clientId] = { element: playerGroup, body: playerBody, head: playerHead, nameTag: playerNameTag };
        } else if (this.players[clientId] && this.players[clientId].nameTag.textContent !== username) {
            this.players[clientId].nameTag.textContent = username;
        }

        // Calculate screen position based on tile coordinates
        const screenPos = this.camera.tileToScreen(x, y);
        const drawX = screenPos.x;
        const drawY = screenPos.y + this.TILE_HEIGHT;

        playerGroup.setAttribute('transform', `translate(${drawX}, ${drawY})`);

        if (!this.players[clientId].animator) {
            this.players[clientId].animator = new CharacterAnimator(playerGroup);
        }

        // Update Z-ordering
        this.updatePlayerZOrder();

        // If this is the local player, update camera focus
        if (clientId === this.room.clientId) {
            this.camera.setTarget(x, y);
        }
    }

    updatePlayerZOrder() {
        // Sort players by their coordinates for proper depth rendering
        Array.from(this.world.playersGroup.children)
            .sort((a, b) => {
                const presenceA = this.room.presence[a.id.replace('player-', '')] || { y: 0, x: 0 };
                const presenceB = this.room.presence[b.id.replace('player-', '')] || { y: 0, x: 0 };
                return (presenceA.x + presenceA.y) - (presenceB.x + presenceB.y);
            })
            .forEach(p => this.world.playersGroup.appendChild(p));
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

        if (cursorTileX !== undefined && cursorTileY !== undefined) {
            devText += ` | Cursor: (${cursorTileX}, ${cursorTileY}) [${tileType}]`;
        }

        // Add camera angle information
        if (this.camera) {
            devText += ` | Camera: ${this.camera.angle}°`;
        }

        this.devInfo.textContent = devText;
    }

    initializeGame() {
        try {
            this.room.initialize();
            console.log('Websim initialized:', this.room.clientId);

            // Initialize the world
            const worldGroup = this.world.initialize();

            // Create pathfinder with world tiles
            this.pathfinder = new TilePathfinder(this.world.worldTiles, this.GRID_SIZE_X, this.GRID_SIZE_Y);

            // Create movement manager
            this.movementManager = new MovementManager(this.room);

            // Initialize camera system
            this.camera = new Camera(this.svg, this.TILE_WIDTH, this.TILE_HEIGHT);
            this.camera.initialize(worldGroup);

            // Initialize camera controls
            this.cameraControls = new CameraControls(this.camera, this);
            this.cameraControls.initialize();

            // Initialize custom cursor
            this.initializeCustomCursor();

            // Add click listener for movement
            this.svg.addEventListener('click', this.handleMapClick);

            // Set initial state if not present
            if (!this.room.presence[this.room.clientId]?.hasOwnProperty('x')) {
                let sx = Math.floor(this.GRID_SIZE_X / 2);
                let sy = Math.floor(this.GRID_SIZE_Y / 2);

                // Ensure starting tile isn't water
                while (this.world.getTileType(sx, sy) === 'water') {
                    sx = Math.floor(Math.random() * this.GRID_SIZE_X);
                    sy = Math.floor(Math.random() * this.GRID_SIZE_Y);
                }
                this.room.updatePresence({ x: sx, y: sy });
            }

            // Setup movement animator
            if (this.players[this.room.clientId]) {
                this.movementManager.setAnimator(this.players[this.room.clientId].animator);
            }

            // Draw initial players
            for (const clientId in this.room.presence) {
                if (this.room.peers[clientId]) {
                    this.drawPlayer(clientId, this.room.presence[clientId], this.room.peers[clientId]);
                }
            }

            this.updateDevInfo();

            // Subscribe to presence updates
            this.room.subscribePresence((updatedPresence) => {
                const currentClientIds = new Set(Object.keys(this.players));
                const incomingClientIds = new Set(Object.keys(this.room.presence));

                for (const clientId in this.room.presence) {
                    if (this.room.peers[clientId]) {
                        this.drawPlayer(clientId, this.room.presence[clientId], this.room.peers[clientId]);
                        currentClientIds.delete(clientId);
                    } else {
                        this.removePlayer(clientId);
                        currentClientIds.delete(clientId);
                    }
                }

                currentClientIds.forEach(this.removePlayer.bind(this));
                this.updateDevInfo();
            });

            // The rest of the subscription handlers remain unchanged
            this.room.subscribeRoomState((updatedRoomState) => {
                console.log('Room state updated:', updatedRoomState);
            });

            this.room.onmessage = (event) => {
                console.log("Received message:", event);
                const data = event.data;
                switch (data.type) {
                    case "connected":
                        console.log(`Client connected: ${data.clientId}, ${data.username}`);
                        this.updateDevInfo();
                        break;
                    case "disconnected":
                        console.log(`Client disconnected: ${data.clientId}, ${data.username}`);
                        this.removePlayer(data.clientId);
                        this.updateDevInfo();
                        break;
                    default:
                        console.log("Received event:", data);
                }
            };

            this.room.subscribePresenceUpdateRequests((updateRequest, fromClientId) => {
                console.log(`Received presence update request from ${fromClientId}:`, updateRequest);
            });

        } catch (error) {
            console.error("Failed to initialize Websim:", error);
            this.devInfo.textContent = "Error connecting.";
        }
    }
}
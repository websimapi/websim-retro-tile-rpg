import { TilePathfinder, MovementManager } from './pathfinding.js';
import { CharacterAnimator } from './animations.js';

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
        this.clickMarkerGroup = null;
        this.customCursor = null;
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

        this.handleMapClick = this.handleMapClick.bind(this);
        this.updateCustomCursorPosition = this.updateCustomCursorPosition.bind(this);
        this.updateDevInfo = this.updateDevInfo.bind(this);
    }

    handleMapClick(event) {
        const svgRect = this.svg.getBoundingClientRect();
        const clickX = event.clientX - svgRect.left;
        const clickY = event.clientY - svgRect.top;

        const tilesGroup = this.svg.getElementById('tiles-group');
        const worldTransform = tilesGroup ? tilesGroup.transform.baseVal.consolidate().matrix : { e: 0, f: 0 };

        const targetTile = this.screenToTile(clickX, clickY, worldTransform);
        const targetX = Math.max(0, Math.min(this.GRID_SIZE_X - 1, targetTile.x));
        const targetY = Math.max(0, Math.min(this.GRID_SIZE_Y - 1, targetTile.y));

        const currentPos = this.room.presence[this.room.clientId] || { x: 0, y: 0 };

        if (this.worldTiles[`${targetX},${targetY}`] === 'water') {
            console.log("Cannot pathfind into water.");
            return;
        }

        const path = this.pathfinder.findPath(
            currentPos.x,
            currentPos.y,
            targetX,
            targetY
        );

        if (path) {
            this.createClickMarker(clickX, clickY);

            path.shift();
            if (path.length > 0) {
                this.movementManager.startMoving(path);
            }
        }
    }

    tileToScreen(x, y) {
        const screenX = (x - y) * (this.TILE_WIDTH / 2);
        const screenY = (x + y) * (this.TILE_HEIGHT / 2);
        return { x: screenX, y: screenY };
    }

    screenToTile(screenX, screenY, worldTransform) {
        const adjustedX = screenX - worldTransform.e;
        const adjustedY = screenY - worldTransform.f;

        const tileX = Math.floor((adjustedX / (this.TILE_WIDTH / 2) + adjustedY / (this.TILE_HEIGHT / 2)) / 2 + 0.5);
        const tileY = Math.floor((adjustedY / (this.TILE_HEIGHT / 2) - adjustedX / (this.TILE_WIDTH / 2)) / 2 + 0.5);

        return { x: tileX, y: tileY };
    }

    drawWorld() {
        const tilesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        tilesGroup.id = 'tiles-group';

        const viewCenterX = this.svg.getAttribute('width') / 2;
        const viewCenterY = this.svg.getAttribute('height') / 2 - this.TILE_HEIGHT * 5;

        for (let x = 0; x < this.GRID_SIZE_X; x++) {
            for (let y = 0; y < this.GRID_SIZE_Y; y++) {
                const tileKey = `${x},${y}`;
                const tileType = this.worldTiles[tileKey] || 'grass';
                const pos = this.tileToScreen(x, y);

                const tile = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                const points = [
                    { x: pos.x, y: pos.y + this.TILE_HEIGHT / 2 },
                    { x: pos.x + this.TILE_WIDTH / 2, y: pos.y + this.TILE_HEIGHT },
                    { x: pos.x, y: pos.y + this.TILE_HEIGHT * 1.5 },
                    { x: pos.x - this.TILE_WIDTH / 2, y: pos.y + this.TILE_HEIGHT }
                ].map(p => `${p.x},${p.y}`).join(' ');

                tile.setAttribute('points', points);
                tile.setAttribute('class', `tile tile-${tileType}`);
                tile.dataset.x = x;
                tile.dataset.y = y;
                tilesGroup.appendChild(tile);
            }
        }
        tilesGroup.setAttribute('transform', `translate(${viewCenterX}, ${viewCenterY})`);

        const playersGroup = this.svg.getElementById('players-group');
        if (playersGroup) {
            this.svg.insertBefore(tilesGroup, playersGroup);
        } else {
            this.svg.appendChild(tilesGroup);
        }

        this.svg.addEventListener('click', this.handleMapClick);

        this.clickMarkerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.clickMarkerGroup.id = 'click-markers-group';
        const targetNodeForMarkers = playersGroup || this.svg.lastChild;
        if (targetNodeForMarkers === playersGroup) {
            this.svg.insertBefore(this.clickMarkerGroup, playersGroup);
        } else {
            this.svg.appendChild(this.clickMarkerGroup);
        }

        this.initializeCustomCursor();
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

        this.customCursor.setAttribute('transform', `translate(${mouseX}, ${mouseY})`);

        if (this.customCursor.classList.contains('active')) {
            const tilesGroup = this.svg.getElementById('tiles-group');
            const worldTransform = tilesGroup ? tilesGroup.transform.baseVal.consolidate().matrix : { e: 0, f: 0 };
            const tileUnderCursor = this.screenToTile(mouseX, mouseY, worldTransform);

            const cursorTileX = Math.max(0, Math.min(this.GRID_SIZE_X - 1, tileUnderCursor.x));
            const cursorTileY = Math.max(0, Math.min(this.GRID_SIZE_Y - 1, tileUnderCursor.y));

            const tileKey = `${cursorTileX},${cursorTileY}`;
            const tileType = this.worldTiles[tileKey] || 'unknown';

            this.updateDevInfo(cursorTileX, cursorTileY, tileType);
        } else {
            this.updateDevInfo();
        }
    }

    drawPlayer(clientId, presenceData, peerData) {
        const { x = 0, y = 0 } = presenceData || {};
        const { username = 'Player', avatarUrl } = peerData || {};

        let playerGroup = this.svg.getElementById(`player-${clientId}`);
        let playerNameTag;

        if (!playerGroup) {
            playerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            playerGroup.id = `player-${clientId}`;
            playerGroup.classList.add('player');

            const playerBody = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            playerBody.setAttribute('class', 'player-body');
            playerBody.setAttribute('x', -8);
            playerBody.setAttribute('y', -25);
            playerBody.setAttribute('width', 16);
            playerBody.setAttribute('height', 20);
            playerGroup.appendChild(playerBody);

            const playerHead = document.createElementNS("http://www.w3.org/2000/svg", "circle");
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

            let playersGroup = this.svg.getElementById('players-group');
            if (!playersGroup) {
                playersGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                playersGroup.id = 'players-group';
                const tilesGroup = this.svg.getElementById('tiles-group');
                const markersGroup = this.svg.getElementById('click-markers-group');
                let referenceNode = this.svg.lastChild;
                if (markersGroup && markersGroup.nextSibling) {
                    referenceNode = markersGroup.nextSibling;
                } else if (tilesGroup && tilesGroup.nextSibling) {
                    referenceNode = tilesGroup.nextSibling;
                }
                this.svg.insertBefore(playersGroup, referenceNode);
            }
            playersGroup.appendChild(playerGroup);

            this.players[clientId] = {
                element: playerGroup,
                body: playerBody,
                head: playerHead,
                nameTag: playerNameTag,
                animator: new CharacterAnimator(playerGroup)
            };

            if (clientId === this.room.clientId) {
                this.movementManager.setAnimator(this.players[clientId].animator);
            }
        } else {
            playerNameTag = this.players[clientId].nameTag;
            if (playerNameTag.textContent !== username) {
                playerNameTag.textContent = username;
            }
        }

        const screenPos = this.tileToScreen(x, y);
        const drawX = screenPos.x;
        const drawY = screenPos.y + this.TILE_HEIGHT;

        const tilesGroup = this.svg.getElementById('tiles-group');
        const worldTransform = tilesGroup ? tilesGroup.transform.baseVal.consolidate().matrix : { e: 0, f: 0 };

        playerGroup.setAttribute('transform', `translate(${worldTransform.e + drawX}, ${worldTransform.f + drawY})`);

        const sortedPlayers = Array.from(playersGroup.children).sort((a, b) => {
            const presenceA = this.room.presence[a.id.replace('player-', '')] || { x: 0, y: 0 };
            const presenceB = this.room.presence[b.id.replace('player-', '')] || { x: 0, y: 0 };
            const depthA = presenceA.y * this.GRID_SIZE_X + presenceA.x;
            const depthB = presenceB.y * this.GRID_SIZE_X + presenceB.x;
            return depthA - depthB;
        });
        sortedPlayers.forEach(p => playersGroup.appendChild(p));
    }

    removePlayer(clientId) {
        const playerElement = this.svg.getElementById(`player-${clientId}`);
        if (playerElement) {
            playerElement.remove();
        }
        delete this.players[clientId];
    }

    updateDevInfo(cursorTileX, cursorTileY, tileType) {
        const playerPresence = this.room.presence[this.room.clientId];
        const pos = playerPresence ? `Pos: (${playerPresence.x}, ${playerPresence.y})` : 'Pos: (N/A, N/A)';
        const peersCount = Object.keys(this.room.peers).length;
        let devText = `User: ${this.room.peers[this.room.clientId]?.username || 'Connecting...'} | ${pos} | Peers: ${peersCount}`;

        if (cursorTileX !== undefined && cursorTileY !== undefined) {
            devText += ` | Cursor: (${cursorTileX}, ${cursorTileY}) [${tileType || 'unknown'}]`;
        }

        this.devInfo.textContent = devText;
    }

    createClickMarker(screenX, screenY) {
        const markerSize = 10;
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "g");
        marker.setAttribute('class', 'click-marker');
        marker.setAttribute('transform', `translate(${screenX}, ${screenY})`);

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

        if (this.clickMarkerGroup) {
            this.clickMarkerGroup.appendChild(marker);
        } else {
            console.warn("Click marker group not found, appending marker to SVG root.");
            this.svg.appendChild(marker);
        }

        const removeMarker = () => {
            if (marker.parentNode) {
                marker.remove();
            }
        };
        marker.addEventListener('animationend', removeMarker);
        setTimeout(removeMarker, 600);
    }

    async initializeGame() {
        try {
            await this.room.initialize();
            console.log('Websim initialized:', this.room.clientId);
            console.log('Peers:', this.room.peers);
            console.log('Initial Presence:', this.room.presence);
            console.log('Initial Room State:', this.room.roomState);

            this.drawWorld();

            if (!this.room.presence[this.room.clientId] || !this.room.presence[this.room.clientId].hasOwnProperty('x')) {
                let sx = Math.floor(this.GRID_SIZE_X / 2);
                let sy = Math.floor(this.GRID_SIZE_Y / 2);
                while (this.worldTiles[`${sx},${sy}`] === 'water') {
                    sx = Math.floor(Math.random() * this.GRID_SIZE_X);
                    sy = Math.floor(Math.random() * this.GRID_SIZE_Y);
                }
                console.log(`Setting initial position for ${this.room.clientId} to (${sx}, ${sy})`);
                this.room.updatePresence({ x: sx, y: sy });
            }

            for (const clientId in this.room.peers) {
                const presenceData = this.room.presence[clientId];
                const peerData = this.room.peers[clientId];
                if (presenceData && peerData) {
                    console.log(`Drawing initial player: ${clientId}`);
                    this.drawPlayer(clientId, presenceData, peerData);
                } else {
                    console.log(`Skipping initial draw for ${clientId} - missing presence or peer data`);
                }
            }

            if (this.players[this.room.clientId]) {
                this.movementManager.setAnimator(this.players[this.room.clientId].animator);
            }

            this.updateDevInfo();

            this.room.subscribePresence((updatedPresence) => {
                const currentClientIds = new Set(Object.keys(this.players));
                const incomingClientIds = new Set(Object.keys(this.room.presence));

                for (const clientId in this.room.presence) {
                    const presenceData = this.room.presence[clientId];
                    const peerData = this.room.peers[clientId];

                    if (peerData) {
                        if (presenceData) {
                            this.drawPlayer(clientId, presenceData, peerData);
                            currentClientIds.delete(clientId);
                        } else {
                            console.warn(`Presence data missing for client ${clientId}, removing.`);
                            this.removePlayer(clientId);
                            currentClientIds.delete(clientId);
                        }
                    } else {
                        console.log(`Peer data missing for ${clientId}, removing player graphic.`);
                        this.removePlayer(clientId);
                        currentClientIds.delete(clientId);
                    }
                }

                currentClientIds.forEach(clientId => {
                    console.log(`Removing player ${clientId} (no longer present or peer data missing)`);
                    this.removePlayer(clientId);
                });

                this.updateDevInfo();
            });

            this.room.subscribeRoomState((updatedRoomState) => {
                console.log('Room state updated:', updatedRoomState);
            });

            this.room.onmessage = (event) => {
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
                        console.log("Received unhandled event:", data);
                }
            };

            this.room.subscribePresenceUpdateRequests((updateRequest, fromClientId) => {
                console.log(`Received presence update request from ${fromClientId}:`, updateRequest);
            });
        } catch (error) {
            console.error("Failed to initialize Websim:", error);
            this.devInfo.textContent = "Error connecting.";
            const errorMsg = document.createElement('p');
            errorMsg.textContent = "Connection Error. Please refresh.";
            errorMsg.style.color = 'red';
            errorMsg.style.textAlign = 'center';
            this.gameContainer.appendChild(errorMsg);
        }
    }
}
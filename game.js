import { World } from './world.js';
import { Camera } from './camera.js';
import { CameraControls } from './cameraControls.js';
import { CharacterAnimator } from './animations.js';
import { TilePathfinder, MovementManager } from './pathfinding.js';

export class Game {
    constructor(svg, gameContainer, devInfo) {
        this.svg = svg;
        this.gameContainer = gameContainer;
        this.devInfo = devInfo;
        
        // Game constants
        this.TILE_WIDTH = 64;
        this.TILE_HEIGHT = 32;
        this.GRID_SIZE_X = 30;
        this.GRID_SIZE_Y = 30;
        
        // Game state
        this.playerPosition = { x: 10, y: 10 };
        this.playerElement = null;
        this.customCursor = null;
        
        // Game components
        this.world = null;
        this.camera = null;
        this.cameraControls = null;
        this.pathfinder = null;
        this.movementManager = null;
        
        // Room integration for multiplayer
        this.room = {
            updatePresence: (presence) => {
                // Update local player position
                if (presence.x !== undefined && presence.y !== undefined) {
                    this.playerPosition.x = presence.x;
                    this.playerPosition.y = presence.y;
                    this.updatePlayerPosition();
                    
                    // Update camera to follow player
                    if (this.camera) {
                        this.camera.setTarget(this.playerPosition.x, this.playerPosition.y);
                    }
                }
            }
        };
    }
    
    initializeGame() {
        // Resize SVG to match container
        this.resizeSVG();
        window.addEventListener('resize', () => this.resizeSVG());
        
        // Initialize world and pathfinding
        this.world = new World(this.svg, this.TILE_WIDTH, this.TILE_HEIGHT, this.GRID_SIZE_X, this.GRID_SIZE_Y);
        const worldGroup = this.world.initialize();
        
        // Initialize camera and controls
        this.camera = new Camera(this.svg, this.TILE_WIDTH, this.TILE_HEIGHT);
        this.camera.initialize(worldGroup);
        this.camera.setTarget(this.playerPosition.x, this.playerPosition.y);
        
        this.cameraControls = new CameraControls(this.camera, this);
        this.cameraControls.initialize();
        
        // Create pathfinder and movement manager
        this.pathfinder = new TilePathfinder(this.world.worldTiles, this.GRID_SIZE_X, this.GRID_SIZE_Y);
        this.movementManager = new MovementManager(this.room);
        
        // Create player
        this.createPlayer();
        
        // Setup custom cursor
        this.setupCustomCursor();
        
        // Add event listeners
        this.svg.addEventListener('click', this.handleMapClick.bind(this));
        
        // Update dev info
        this.updateDevInfo(this.playerPosition.x, this.playerPosition.y, 'Starting position');
    }
    
    resizeSVG() {
        const containerWidth = this.gameContainer.clientWidth;
        const containerHeight = this.gameContainer.clientHeight;
        
        this.svg.setAttribute('width', containerWidth);
        this.svg.setAttribute('height', containerHeight);
    }
    
    createPlayer() {
        // Create player element
        this.playerElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.playerElement.setAttribute('class', 'player');
        
        // Create player body
        const body = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        body.setAttribute('class', 'player-body');
        body.setAttribute('x', -8);
        body.setAttribute('y', -16);
        body.setAttribute('width', 16);
        body.setAttribute('height', 24);
        body.setAttribute('rx', 2);
        
        // Create player head
        const head = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        head.setAttribute('class', 'player-head');
        head.setAttribute('cx', 0);
        head.setAttribute('cy', -20);
        head.setAttribute('r', 6);
        
        // Create player name
        const name = document.createElementNS("http://www.w3.org/2000/svg", "text");
        name.setAttribute('class', 'player-name');
        name.setAttribute('x', 0);
        name.setAttribute('y', -30);
        name.textContent = 'Player';
        
        // Add elements to player
        this.playerElement.appendChild(body);
        this.playerElement.appendChild(head);
        this.playerElement.appendChild(name);
        
        // Position player
        this.updatePlayerPosition();
        
        // Add player to world
        this.world.playersGroup.appendChild(this.playerElement);
        
        // Initialize character animator
        this.characterAnimator = new CharacterAnimator(this.playerElement);
        this.movementManager.setAnimator(this.characterAnimator);
    }
    
    updatePlayerPosition() {
        if (!this.playerElement) return;
        
        const screenPos = this.world.tileToScreen(this.playerPosition.x, this.playerPosition.y);
        this.playerElement.setAttribute('transform', `translate(${screenPos.x}, ${screenPos.y})`);
    }
    
    setupCustomCursor() {
        // Create custom cursor
        this.customCursor = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.customCursor.id = 'custom-cursor';
        
        // Create cursor circle
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute('class', 'cursor-circle');
        circle.setAttribute('cx', 0);
        circle.setAttribute('cy', 0);
        circle.setAttribute('r', 4);
        
        // Create cursor crosshair
        const horizontal = document.createElementNS("http://www.w3.org/2000/svg", "line");
        horizontal.setAttribute('class', 'cursor-line');
        horizontal.setAttribute('x1', -6);
        horizontal.setAttribute('y1', 0);
        horizontal.setAttribute('x2', 6);
        horizontal.setAttribute('y2', 0);
        
        const vertical = document.createElementNS("http://www.w3.org/2000/svg", "line");
        vertical.setAttribute('class', 'cursor-line');
        vertical.setAttribute('x1', 0);
        vertical.setAttribute('y1', -6);
        vertical.setAttribute('x2', 0);
        vertical.setAttribute('y2', 6);
        
        // Add elements to cursor
        this.customCursor.appendChild(circle);
        this.customCursor.appendChild(horizontal);
        this.customCursor.appendChild(vertical);
        
        // Add cursor to SVG
        this.svg.appendChild(this.customCursor);
        
        // Add event listeners for cursor
        this.gameContainer.addEventListener('mouseenter', () => {
            this.customCursor.classList.add('active');
        });
        
        this.gameContainer.addEventListener('mouseleave', () => {
            this.customCursor.classList.remove('active');
        });
        
        this.gameContainer.addEventListener('mousemove', this.updateCustomCursorPosition.bind(this));
    }
    
    updateCustomCursorPosition(event) {
        const svgRect = this.svg.getBoundingClientRect();
        const mouseX = event.clientX - svgRect.left;
        const mouseY = event.clientY - svgRect.top;

        this.customCursor.setAttribute('transform', `translate(${mouseX}, ${mouseY})`);

        if (this.customCursor.classList.contains('active') && this.camera) {
            const tileUnderCursor = this.camera.screenToTile(mouseX, mouseY);

            const cursorTileX = Math.max(0, Math.min(this.GRID_SIZE_X - 1, tileUnderCursor.x));
            const cursorTileY = Math.max(0, Math.min(this.GRID_SIZE_Y - 1, tileUnderCursor.y));

            const tileType = this.world.getTileType(cursorTileX, cursorTileY);

            this.updateDevInfo(cursorTileX, cursorTileY, tileType);
        }
    }
    
    handleMapClick(event) {
        const svgRect = this.svg.getBoundingClientRect();
        const clickX = event.clientX - svgRect.left;
        const clickY = event.clientY - svgRect.top;
        
        // Create click marker at the exact click position
        this.world.createClickMarker(clickX, clickY);
        
        // Convert screen coordinates to tile coordinates
        const targetTile = this.camera.screenToTile(clickX, clickY);
        
        // Clamp to valid grid positions
        const targetX = Math.max(0, Math.min(this.GRID_SIZE_X - 1, targetTile.x));
        const targetY = Math.max(0, Math.min(this.GRID_SIZE_Y - 1, targetTile.y));
        
        // Check if target tile is walkable
        const tileType = this.world.getTileType(targetX, targetY);
        if (tileType === 'water') {
            console.log('Cannot walk on water!');
            return;
        }
        
        // Find path to target
        const path = this.pathfinder.findPath(
            this.playerPosition.x, 
            this.playerPosition.y, 
            targetX, 
            targetY
        );
        
        if (path && path.length > 0) {
            // Remove the starting position from the path
            path.shift();
            
            // Start moving along the path
            this.movementManager.startMoving(path);
        }
    }
    
    updateDevInfo(x, y, tileType) {
        this.devInfo.innerHTML = `
            Tile: (${x}, ${y})<br>
            Type: ${tileType}<br>
            Camera Angle: ${this.camera ? this.camera.angle : 0}°
        `;
    }
}
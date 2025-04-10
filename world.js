export class World {
    constructor(svg, tileWidth, tileHeight, gridSizeX, gridSizeY) {
        this.svg = svg;
        this.TILE_WIDTH = tileWidth;
        this.TILE_HEIGHT = tileHeight;
        this.GRID_SIZE_X = gridSizeX;
        this.GRID_SIZE_Y = gridSizeY;
        this.worldTiles = {};
        this.tilesGroup = null;
        this.clickMarkerGroup = null;
    }
    
    initialize() {
        // Generate the world tiles
        this.generateWorldTiles();
        
        // Create a group for all world elements
        this.worldGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.worldGroup.id = 'world-group';
        
        // Draw the world tiles
        this.tilesGroup = this.drawTiles();
        this.worldGroup.appendChild(this.tilesGroup);
        
        // Create a group for click markers
        this.clickMarkerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.clickMarkerGroup.id = 'click-markers-group';
        this.worldGroup.appendChild(this.clickMarkerGroup);
        
        // Create a group for players
        this.playersGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.playersGroup.id = 'players-group';
        this.worldGroup.appendChild(this.playersGroup);
        
        // Add the world group to the SVG
        this.svg.appendChild(this.worldGroup);
        
        return this.worldGroup;
    }
    
    generateWorldTiles() {
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
    }
    
    drawTiles() {
        const tilesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        tilesGroup.id = 'tiles-group';

        for (let x = 0; x < this.GRID_SIZE_X; x++) {
            for (let y = 0; y < this.GRID_SIZE_Y; y++) {
                const tileKey = `${x},${y}`;
                const tileType = this.worldTiles[tileKey] || 'grass';
                const pos = this.tileToScreen(x, y);

                const tile = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                const points = [
                    { x: pos.x, y: pos.y + this.TILE_HEIGHT / 2 },                     // Top point
                    { x: pos.x + this.TILE_WIDTH / 2, y: pos.y + this.TILE_HEIGHT },   // Right point
                    { x: pos.x, y: pos.y + this.TILE_HEIGHT * 1.5 },                   // Bottom point
                    { x: pos.x - this.TILE_WIDTH / 2, y: pos.y + this.TILE_HEIGHT }    // Left point
                ].map(p => `${p.x},${p.y}`).join(' ');

                tile.setAttribute('points', points);
                tile.setAttribute('class', `tile tile-${tileType}`);
                tile.dataset.x = x;
                tile.dataset.y = y;
                tilesGroup.appendChild(tile);
            }
        }

        return tilesGroup;
    }
    
    tileToScreen(x, y) {
        const screenX = (x - y) * (this.TILE_WIDTH / 2);
        const screenY = (x + y) * (this.TILE_HEIGHT / 2);
        return { x: screenX, y: screenY };
    }
    
    createClickMarker(screenX, screenY) {
        const markerSize = 10; // Size of the X marker lines
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "g");
        marker.setAttribute('class', 'click-marker');
        marker.setAttribute('transform', `translate(${screenX}, ${screenY})`);

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

        this.clickMarkerGroup.appendChild(marker);

        // Remove the marker after animation
        marker.addEventListener('animationend', () => marker.remove());
        setTimeout(() => { if (marker.parentNode) marker.remove(); }, 600);
    }
    
    getTileType(x, y) {
        const key = `${x},${y}`;
        return this.worldTiles[key] || 'unknown';
    }
}
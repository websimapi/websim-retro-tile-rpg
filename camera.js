export class CameraManager {
    constructor(svg, gameContainer) {
        this.svg = svg;
        this.gameContainer = gameContainer;
        this.targetX = 0;
        this.targetY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.viewWidth = parseInt(svg.getAttribute('width'));
        this.viewHeight = parseInt(svg.getAttribute('height'));
    }

    updateCameraPosition(playerX, playerY, tileWidth, tileHeight) {
        // Convert tile coordinates to screen coordinates
        const screenX = (playerX - playerY) * (tileWidth / 2);
        const screenY = (playerX + playerY) * (tileHeight / 2);

        // Calculate center offset
        this.targetX = this.viewWidth / 2 - screenX;
        this.targetY = this.viewHeight / 2 - screenY;

        // Update transform on tiles and players groups
        const tilesGroup = this.svg.getElementById('tiles-group');
        const playersGroup = this.svg.getElementById('players-group');
        const clickMarkersGroup = this.svg.getElementById('click-markers-group');

        if (tilesGroup) tilesGroup.setAttribute('transform', `translate(${this.targetX}, ${this.targetY})`);
        if (playersGroup) playersGroup.setAttribute('transform', `translate(${this.targetX}, ${this.targetY})`);
        if (clickMarkersGroup) clickMarkersGroup.setAttribute('transform', `translate(${this.targetX}, ${this.targetY})`);
    }
}